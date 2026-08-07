import { Router } from 'express';
import type { Request as ExpressRequest, Response } from 'express';
import { z } from 'zod';
import { LLMProviderSchema } from '../validation/llm.ts';
import { generateStructuredCompletion } from '../services/structured.ts';
import { StructuredTopicSchema, CategorySchema } from '../../src/utils/topicSchema.ts';
import { IAS_SYSTEM_PROMPT, buildUserPrompt } from '../../src/utils/prompts.ts';
import { logger } from '../../src/utils/logger.ts';
import { sendError } from '../utils/errors.ts';

const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  category: CategorySchema.optional(),
  webContext: z.string().optional(),
  provider: LLMProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  baseUrl: z.string().url().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

const router = Router();

router.post('/generate', async (req: ExpressRequest, res: Response) => {
  const parsed = GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'body';
      const list = details[key] ?? (details[key] = []);
      list.push(issue.message);
    }
    sendError(res, 400, 'Invalid generate request', details);
    return;
  }

  const { topic, category, webContext, provider, apiKey, model, temperature, baseUrl, maxRetries } = parsed.data;

  const messages = [
    { role: 'system' as const, content: IAS_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(topic, category, webContext) },
  ];

  try {
    const structured = await generateStructuredCompletion(
      { provider, apiKey, model, messages, temperature, baseUrl },
      StructuredTopicSchema,
      { maxRetries }
    );

    const now = new Date().toISOString();
    res.status(200).json({
      topic: {
        ...structured,
        id: crypto.randomUUID(),
        source: 'web',
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    logger.error({ err: error?.message, retries: maxRetries }, 'Structured topic generation failed');
    sendError(res, 502, error?.message || 'Failed to generate structured topic');
  }
});

export default router;