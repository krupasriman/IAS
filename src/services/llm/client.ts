import type { LLMProvider, LLMSettings } from "../../types/settings.types";
import type { Topic } from "../../types/topic.types";

export interface LLMConfig {
	provider: LLMProvider;
	apiKey?: string;
	baseUrl?: string;
	model?: string;
	temperature?: number;
}

const isBrowser = typeof window !== "undefined";
const PROXY_URL = "/api/llm";
const GENERATE_URL = "/api/generate";

function getApiKey(settings: LLMSettings & { apiKey?: string }): string {
	if (typeof settings.apiKey === "string" && settings.apiKey.trim()) {
		return settings.apiKey.trim();
	}
	return (settings.apiKeys?.[settings.provider] || "").trim();
}

export interface GenerateTopicOptions {
	topic: string;
	category?: string;
	webContext?: string;
	maxRetries?: number;
}

export async function generateStructuredTopic(
	options: GenerateTopicOptions,
	settings: LLMSettings,
): Promise<Topic> {
	const apiKey = getApiKey(settings);

	const { provider, model, temperature, baseUrl } = settings;

	if (typeof fetch !== "undefined") {
		const response = await fetch(GENERATE_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				topic: options.topic,
				category: options.category,
				webContext: options.webContext,
				provider,
				apiKey: apiKey || undefined,
				model,
				temperature,
				baseUrl,
				maxRetries: options.maxRetries,
			}),
		});

		const text = await response.text();
		let data: Record<string, unknown> = {};
		try {
			data = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
		} catch {
			throw new Error(
				`Server returned invalid JSON (${response.status} ${response.statusText}): ${text.slice(0, 200)}`,
			);
		}

		if (!response.ok) {
			throw new Error(
				(typeof data?.error === "string" ? data.error : undefined) ||
					`Topic generation failed: ${response.status} ${response.statusText}`,
			);
		}
		if (!data?.topic) {
			throw new Error("Topic generation returned no topic");
		}
		return data.topic as Topic;
	}

	throw new Error(
		"Structured topic generation requires a fetch-compatible environment.",
	);
}

export async function streamStructuredTopic(
	options: GenerateTopicOptions,
	settings: LLMSettings,
	onChunk: (text: string) => void,
): Promise<string> {
	const apiKey = getApiKey(settings);

	const { provider, model, temperature, baseUrl } = settings;
	const STREAM_URL = "/api/generate/stream";

	const response = await fetch(STREAM_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			topic: options.topic,
			category: options.category,
			webContext: options.webContext,
			provider,
			apiKey: apiKey || undefined,
			model,
			temperature,
			baseUrl,
		}),
	});

	if (!response.ok || !response.body) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Stream request failed: ${response.status} ${text.slice(0, 200)}`,
		);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder("utf-8");
	let accumulatedText = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const chunk = decoder.decode(value, { stream: true });
		const lines = chunk.split("\n");

		for (const line of lines) {
			if (line.trim() === "" || line.trim() === "data: [DONE]") continue;

			if (line.startsWith("data: ")) {
				try {
					const data = JSON.parse(line.slice(6));
					if (data.error) throw new Error(data.error);
					if (data.content) {
						accumulatedText += data.content;
						onChunk(accumulatedText);
					}
				} catch (_e) {
					// ignore parsing error for chunk
				}
			}
		}
	}

	return accumulatedText;
}

/**
 * Generic callLLM that works with OpenAI-compatible endpoints
 * (OpenRouter, Groq).
 * Uses backend proxy in browser to avoid CORS issues.
 */
export async function callLLM(
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	settings: LLMSettings,
): Promise<string> {
	const apiKey = getApiKey(settings);

	if (!apiKey) {
		throw new Error(
			"API key not configured. Please add your API key in Settings.",
		);
	}

	if (isBrowser) {
		return callLLMViaProxy(messages, { ...settings, apiKey });
	}

	return callLLMDirect(messages, { ...settings, apiKey });
}

async function callLLMViaProxy(
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	settings: LLMSettings & { apiKey: string },
): Promise<string> {
	const { provider, apiKey, model, temperature, baseUrl } = settings;

	const response = await fetch(PROXY_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			provider,
			apiKey,
			model,
			messages,
			temperature,
			baseUrl,
		}),
	});

	const text = await response.text();
	let data: Record<string, unknown> = {};
	try {
		data = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
	} catch {
		throw new Error(
			`Server returned invalid JSON (${response.status} ${response.statusText}): ${text.slice(0, 200)}`,
		);
	}

	if (!response.ok) {
		throw new Error(
			(typeof data?.error === "string" ? data.error : undefined) ||
				`LLM request failed: ${response.status} ${response.statusText}`,
		);
	}

	if (typeof data?.content !== "string") {
		throw new Error("LLM response contained no content");
	}

	return data.content;
}

async function callLLMDirect(
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	settings: LLMSettings & { apiKey: string },
): Promise<string> {
	const { provider, apiKey, model, temperature, baseUrl } = settings;

	// Default: OpenAI-compatible endpoint (OpenRouter, Groq)
	const normalizedBaseUrl = normalizeBaseUrl(provider, baseUrl);
	const url = `${normalizedBaseUrl}/chat/completions`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages,
			temperature: temperature ?? 0.3,
			max_tokens: 4000,
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => "");
		throw new Error(
			`LLM request failed: ${response.status} ${response.statusText} ${errorBody.slice(0, 300)}`,
		);
	}

	const data = await response.json();
	const content = data?.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("LLM response contained no content");
	}
	return content;
}

export function normalizeBaseUrl(
	provider: LLMProvider,
	userBaseUrl?: string,
): string {
	if (userBaseUrl?.trim()) {
		return userBaseUrl.replace(/\/$/, "");
	}

	const defaults: Record<string, string> = {
		openrouter: "https://openrouter.ai/api/v1",
		groq: "https://api.groq.com/openai/v1",
		generalcompute: "https://api.generalcompute.com/v1",
	};

	return defaults[provider] || "https://api.openai.com/v1";
}
