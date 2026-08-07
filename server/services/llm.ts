import type { LLMRequest } from '../validation/llm.ts';

export const PROVIDER_DEFAULTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  generalcompute: 'https://api.generalcompute.com/v1',
};

export const DEFAULT_MAX_TOKENS = 4000;
export const DEFAULT_TEMPERATURE = 0.3;

export interface ProxyResult {
  status: number;
  body: any;
}

export function buildChatCompletionBody(request: LLMRequest, structured = false): any {
  return {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
    ...(structured ? { response_format: { type: 'json_object' as const } } : {}),
  };
}

export function buildChatCompletionUrl(provider: string, baseUrl?: string): string {
  const base = baseUrl || PROVIDER_DEFAULTS[provider] || 'https://api.openai.com/v1';
  return `${base.replace(/\/$/, '')}/chat/completions`;
}

export function buildChatCompletionHeaders(request: LLMRequest): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${request.apiKey}`
  };
}

export async function proxyChatCompletion(request: LLMRequest): Promise<ProxyResult> {
  const url = buildChatCompletionUrl(request.provider, request.baseUrl);
  const headers = buildChatCompletionHeaders(request);
  const body = buildChatCompletionBody(request);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    const message = data?.error?.message || data.raw || `LLM request failed: ${response.status} ${response.statusText}`;
    return { status: response.status, body: { error: message } };
  }

  const content = data?.choices?.[0]?.message?.content || '';
  if (!content) {
    return { status: 500, body: { error: 'LLM response contained no content' } };
  }

  return { status: 200, body: { content } };
}