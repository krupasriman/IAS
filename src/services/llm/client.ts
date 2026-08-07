import type { LLMProvider, LLMSettings } from '../../types/settings.types';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

const isBrowser = typeof window !== 'undefined';
const PROXY_URL = '/api/llm';

function getApiKey(settings: LLMSettings): string {
  return settings.apiKeys?.[settings.provider] || '';
}

/**
 * Generic callLLM that works with OpenAI-compatible endpoints
 * (OpenRouter, Groq).
 * Uses backend proxy in browser to avoid CORS issues.
 */
export async function callLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  settings: LLMSettings
): Promise<string> {
  const apiKey = getApiKey(settings);

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in Settings.');
  }

  if (isBrowser) {
    return callLLMViaProxy(messages, { ...settings, apiKey });
  }

  return callLLMDirect(messages, { ...settings, apiKey });
}

async function callLLMViaProxy(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  settings: LLMSettings & { apiKey: string }
): Promise<string> {
  const { provider, apiKey, model, temperature, baseUrl } = settings;

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model, messages, temperature, baseUrl })
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => '');
    throw new Error(`Server returned invalid JSON: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `LLM request failed: ${response.status} ${response.statusText}`);
  }

  if (!data?.content) {
    throw new Error('LLM response contained no content');
  }

  return data.content;
}

async function callLLMDirect(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  settings: LLMSettings & { apiKey: string }
): Promise<string> {
  const { provider, apiKey, model, temperature, baseUrl } = settings;

  // Default: OpenAI-compatible endpoint (OpenRouter, Groq)
  const normalizedBaseUrl = normalizeBaseUrl(provider, baseUrl);
  const url = `${normalizedBaseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.3,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`LLM request failed: ${response.status} ${response.statusText} ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM response contained no content');
  }
  return content;
}

export function normalizeBaseUrl(provider: LLMProvider, userBaseUrl?: string): string {
  if (userBaseUrl && userBaseUrl.trim()) {
    return userBaseUrl.replace(/\/$/, '');
  }

  const defaults: Record<string, string> = {
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1',
    generalcompute: 'https://api.generalcompute.com/v1'
  };

  return defaults[provider] || 'https://api.openai.com/v1';
}