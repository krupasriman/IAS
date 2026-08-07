import type { ZodType, z } from 'zod';
import type { LLMRequest } from '../validation/llm.ts';
import { buildChatCompletionUrl, buildChatCompletionBody, buildChatCompletionHeaders } from './llm.ts';
import { logger } from '../../src/utils/logger.ts';

export const MAX_STRUCTURED_RETRIES = 5;

export class StructuredLLMError extends Error {
  lastValidation: string[];
  constructor(message: string, lastValidation: string[]) {
    super(message);
    this.name = 'StructuredLLMError';
    this.lastValidation = lastValidation;
  }
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

export async function generateStructuredCompletion<T>(
  request: LLMRequest,
  schema: ZodType<T>,
  options: { maxRetries?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_STRUCTURED_RETRIES;
  const url = buildChatCompletionUrl(request.provider, request.baseUrl);
  const headers = buildChatCompletionHeaders(request);

  let correctiveMessages: Array<{ role: 'system'; content: string }> = [];
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.warn({ attempt, retries: maxRetries }, 'LLM structured output retry');
    }

    const messages = [...request.messages, ...correctiveMessages];
    const body = buildChatCompletionBody({ ...request, messages }, true);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      let errorMessage: string;
      try {
        const data = JSON.parse(responseText);
        errorMessage = data?.error?.message || responseText || `LLM request failed: ${response.status}`;
      } catch {
        errorMessage = responseText || `LLM request failed: ${response.status}`;
      }

      if (attempt >= maxRetries) {
        throw new StructuredLLMError(`LLM request failed after ${maxRetries} retries: ${errorMessage}`, lastErrors);
      }
      correctiveMessages.push({
        role: 'system',
        content: `Your previous request failed with an upstream error: ${errorMessage.slice(0, 500)}. RETRY by producing a valid JSON response matching the required schema.`,
      });
      continue;
    }

    const responseText = await response.text();
    let content = '';
    try {
      const data = JSON.parse(responseText);
      content = data?.choices?.[0]?.message?.content || '';
    } catch {
      content = '';
    }

    if (!content) {
      lastErrors.push('LLM response contained no content');
    } else {
      const jsonText = extractJsonContent(content);
      let parsed: unknown;
      let parseError = '';
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        parseError = 'Response was not valid JSON';
      }

      if (parseError || parsed === undefined) {
        lastErrors.push(parseError || 'Response was not valid JSON');
      } else {
        const result = schema.safeParse(parsed);
        if (result.success) {
          logger.info({ attempt: attempt + 1 }, 'LLM structured output validated');
          return result.data;
        }
        const formatted = formatZodError(result.error);
        lastErrors.push(formatted);
      }
    }

    if (attempt >= maxRetries) {
      throw new StructuredLLMError(
        `Failed to get a valid structured response after ${maxRetries} retries. Last errors: ${lastErrors.join(' | ')}`,
        lastErrors
      );
    }

    correctiveMessages = [
      ...correctiveMessages,
      {
        role: 'system',
        content: `Your previous response failed validation with these errors: ${lastErrors[lastErrors.length - 1]}. Return ONLY a valid JSON object that exactly matches the requested schema. Do not include markdown, prose, or explanations outside the JSON.`,
      },
    ];
  }

  throw new StructuredLLMError(`Failed to get a valid structured response after ${maxRetries} retries`, lastErrors);
}