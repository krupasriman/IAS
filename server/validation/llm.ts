import { z } from 'zod';

export const LLMProviderSchema = z.enum(['openrouter', 'groq', 'generalcompute']);

export const LLMMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
});

export const LLMRequestSchema = z.object({
  provider: LLMProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  messages: z.array(LLMMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  baseUrl: z.string().url().optional(),
});

export type LLMRequest = z.infer<typeof LLMRequestSchema>;