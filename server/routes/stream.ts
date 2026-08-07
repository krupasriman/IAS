import { Router } from 'express';
import type { Request as ExpressRequest, Response } from 'express';
import { z } from 'zod';
import { LLMProviderSchema } from '../validation/llm.ts';
import { CategorySchema } from '../../src/utils/topicSchema.ts';
import { IAS_SYSTEM_PROMPT, buildUserPrompt } from '../../src/utils/prompts.ts';
import { logger } from '../../src/utils/logger.ts';
import { sendError } from '../utils/errors.ts';
import { buildChatCompletionUrl, buildChatCompletionHeaders, buildChatCompletionBody } from '../services/llm.ts';

const StreamRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  category: CategorySchema.optional(),
  webContext: z.string().optional(),
  provider: LLMProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  baseUrl: z.string().url().optional(),
});

const router = Router();

router.post('/generate/stream', async (req: ExpressRequest, res: Response) => {
  const parsed = StreamRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'Invalid stream request', parsed.error.issues as any);
    return;
  }

  const { topic, category, webContext, provider, apiKey, model, temperature, baseUrl } = parsed.data;

  const messages = [
    { role: 'system' as const, content: IAS_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(topic, category, webContext) },
  ];

  const url = buildChatCompletionUrl(provider, baseUrl);
  const headers = buildChatCompletionHeaders({ apiKey } as any);
  
  const baseBody = buildChatCompletionBody({ model, messages, temperature } as any, false);
  const body = { ...baseBody, stream: true };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      logger.error({ status: response.status, error: errorText }, 'Stream upstream error');
      res.write(`data: ${JSON.stringify({ error: `LLM request failed: ${response.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') {
          continue;
        }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices.length > 0) {
              const content = data.choices[0].delta?.content;
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            }
          } catch (e) {
            // Ignore incomplete chunks, standard SSE handling
          }
        }
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    logger.error({ err: error?.message }, 'Stream error');
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

export default router;
