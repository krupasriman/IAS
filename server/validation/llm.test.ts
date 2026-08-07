import { describe, it, expect } from 'vitest';
import { LLMRequestSchema, type LLMRequest } from './llm.ts';
import { buildChatCompletionUrl, buildChatCompletionBody, buildChatCompletionHeaders, PROVIDER_DEFAULTS } from '../services/llm.ts';

const validRequest: LLMRequest = {
  provider: 'openrouter',
  apiKey: 'sk-test',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'hello' }],
};

describe('LLMRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = LLMRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

it('rejects an unknown provider', () => {
    const result = LLMRequestSchema.safeParse({ ...validRequest, provider: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const result = LLMRequestSchema.safeParse({ ...validRequest, messages: [{ role: 'user', content: '' }] });
    expect(result.success).toBe(false);
  });

  it('rejects empty messages array', () => {
    const result = LLMRequestSchema.safeParse({ ...validRequest, messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range temperature', () => {
    const result = LLMRequestSchema.safeParse({ ...validRequest, temperature: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid baseUrl', () => {
    const result = LLMRequestSchema.safeParse({ ...validRequest, baseUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('buildChatCompletionUrl', () => {
  it('uses provider defaults', () => {
    expect(buildChatCompletionUrl('openrouter')).toBe(`${PROVIDER_DEFAULTS.openrouter}/chat/completions`);
    expect(buildChatCompletionUrl('groq')).toBe(`${PROVIDER_DEFAULTS.groq}/chat/completions`);
    expect(buildChatCompletionUrl('generalcompute')).toBe(`${PROVIDER_DEFAULTS.generalcompute}/chat/completions`);
  });

  it('prefers explicit baseUrl and strips trailing slash', () => {
    expect(buildChatCompletionUrl('openrouter', 'https://example.com/')).toBe('https://example.com/chat/completions');
  });
});

describe('buildChatCompletionBody', () => {
  it('applies defaults for temperature and max_tokens', () => {
    const body = buildChatCompletionBody(validRequest);
    expect(body.max_tokens).toBe(4000);
    expect(body.temperature).toBe(0.3);
  });

  it('respects provided temperature', () => {
    const body = buildChatCompletionBody({ ...validRequest, temperature: 1 });
    expect(body.temperature).toBe(1);
  });

  it('omits response_format by default', () => {
    const body = buildChatCompletionBody(validRequest);
    expect(body.response_format).toBeUndefined();
  });

  it('adds json_object response_format when structured', () => {
    const body = buildChatCompletionBody(validRequest, true);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});

describe('buildChatCompletionHeaders', () => {
  it('sets bearer auth header', () => {
    const headers = buildChatCompletionHeaders(validRequest);
    expect(headers.Authorization).toBe('Bearer sk-test');
  });
});