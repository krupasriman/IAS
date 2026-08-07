import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global error handler - ensures all errors return JSON
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/openrouter/models', async (req, res) => {
  try {
    const apiKey = req.headers.authorization;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = apiKey;
    }
    const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenRouter API returned ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch models from OpenRouter' });
  }
});

app.get('/api/generalcompute/models', async (req, res) => {
  try {
    const apiKey = req.headers.authorization;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const response = await fetch('https://api.generalcompute.com/v1/public/models', { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: `General Compute API returned ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch models from General Compute' });
  }
});

app.post('/api/llm', async (req, res) => {
  try {
    const { provider, apiKey, model, messages, temperature, baseUrl } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    let url: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    let body: any = {
      model,
      messages,
      temperature: temperature ?? 0.3,
      max_tokens: 1500
    };

    const defaults: Record<string, string> = {
      openrouter: 'https://openrouter.ai/api/v1',
      groq: 'https://api.groq.com/openai/v1',
      generalcompute: 'https://api.generalcompute.com/v1'
    };
    const base = baseUrl || defaults[provider] || 'https://api.openai.com/v1';
    url = `${base.replace(/\/$/, '')}/chat/completions`;

    console.log(`[LLM Proxy] ${provider} -> ${url}`);
    console.log(`[LLM Proxy] Model: ${model}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.log(`[LLM Proxy] Error response: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: data?.error?.message || errorText || `LLM request failed: ${response.status} ${response.statusText}` });
    }

    const content = data?.choices?.[0]?.message?.content || '';

    if (!content) {
      return res.status(500).json({ error: 'LLM response contained no content' });
    }

    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to process LLM request' });
  }
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});