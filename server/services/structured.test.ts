import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { generateStructuredCompletion, StructuredLLMError, MAX_STRUCTURED_RETRIES } from './structured.ts';
import type { LLMRequest } from '../validation/llm.ts';

const validRequest: LLMRequest = {
  provider: 'openrouter',
  apiKey: 'sk-test',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Generate a topic' }],
};

const schema = z.object({
  title: z.string(),
  count: z.number().int(),
});

interface MockResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

function chatResponse(content: string, status = 200, errorMessage = ''): MockResponse {
  const body = errorMessage
    ? JSON.stringify({ error: { message: errorMessage } })
    : JSON.stringify({ choices: [{ message: { content } }] });
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

function installFetchMock(factory: (calls: FetchCall[]) => MockResponse) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init as RequestInit });
    return factory(calls);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateStructuredCompletion', () => {
  it('returns validated data when the model responds with valid JSON on the first attempt', async () => {
    const { fetchMock } = installFetchMock(() =>
      chatResponse(JSON.stringify({ title: 'Test', count: 3 }))
    );

    const result = await generateStructuredCompletion(validRequest, schema);

    expect(result).toEqual({ title: 'Test', count: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns validated data when the content is wrapped in a markdown code fence', async () => {
    installFetchMock(() =>
      chatResponse('```json\n' + JSON.stringify({ title: 'Fenced', count: 1 }) + '\n```')
    );

    const result = await generateStructuredCompletion(validRequest, schema);
    expect(result).toEqual({ title: 'Fenced', count: 1 });
  });

  it('retries with a corrective message when JSON fails schema validation', async () => {
    const { fetchMock, calls } = installFetchMock((all) => {
      if (all.length === 1) {
        return chatResponse(JSON.stringify({ title: 'Bad', count: 'not-a-number' }));
      }
      return chatResponse(JSON.stringify({ title: 'Fixed', count: 2 }));
    });

    const result = await generateStructuredCompletion(validRequest, schema);

    expect(result).toEqual({ title: 'Fixed', count: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const lastBody = JSON.parse(String(calls[1].init.body)) as any;
    const lastMessage = lastBody.messages[lastBody.messages.length - 1];
    expect(lastMessage.content).toContain('failed validation');
  });

  it('retries when the content is not valid JSON', async () => {
    const { fetchMock } = installFetchMock((all) => {
      if (all.length === 1) {
        return chatResponse('This is not JSON at all');
      }
      return chatResponse(JSON.stringify({ title: 'Ok', count: 0 }));
    });

    const result = await generateStructuredCompletion(validRequest, schema);
    expect(result).toEqual({ title: 'Ok', count: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries when the upstream returns an HTTP error', async () => {
    const { fetchMock } = installFetchMock((all) => {
      if (all.length === 1) {
        return chatResponse('', 429, 'Rate limit exceeded');
      }
      return chatResponse(JSON.stringify({ title: 'Ok', count: 5 }));
    });

    const result = await generateStructuredCompletion(validRequest, schema);
    expect(result).toEqual({ title: 'Ok', count: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting MAX_STRUCTURED_RETRIES retry attempts', async () => {
    const { fetchMock } = installFetchMock(() =>
      chatResponse(JSON.stringify({ title: 'Bad', wrong: 'x' }))
    );

    await expect(generateStructuredCompletion(validRequest, schema)).rejects.toBeInstanceOf(StructuredLLMError);

    expect(fetchMock).toHaveBeenCalledTimes(MAX_STRUCTURED_RETRIES + 1);
  });

  it('honors a custom maxRetries value', async () => {
    const { fetchMock } = installFetchMock(() => chatResponse('garbage'));

    await expect(
      generateStructuredCompletion(validRequest, schema, { maxRetries: 2 })
    ).rejects.toBeInstanceOf(StructuredLLMError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('sends response_format json_object on every attempt', async () => {
    const { calls } = installFetchMock(() =>
      chatResponse(JSON.stringify({ title: 'Ok', count: 1 }))
    );

    await generateStructuredCompletion(validRequest, schema);

    const body = JSON.parse(String(calls[0].init.body)) as any;
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});