export interface OpenRouterModelInfo {
	id: string;
	name: string;
	contextLength: number;
	isFree: boolean;
	description?: string;
	created?: number;
}

export interface GeneralComputeModelInfo {
	id: string;
	name: string;
	description?: string;
	contextLength?: number;
	isFree?: boolean;
	pricing?: {
		prompt: number;
		completion: number;
	};
}

const CACHE_KEY = "ias_openrouter_models_cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const GENERAL_COMPUTE_CACHE_KEY = "ias_generalcompute_models_cache";

export const DEFAULT_OPENROUTER_MODELS: OpenRouterModelInfo[] = [
	{
		id: "meta-llama/llama-3.3-70b-instruct:free",
		name: "Meta: Llama 3.3 70B Instruct (free)",
		contextLength: 131072,
		isFree: true,
		description: "Meta flagship open-weight 70B model. Free on OpenRouter.",
	},
	{
		id: "meta-llama/llama-3.1-8b-instruct:free",
		name: "Meta: Llama 3.1 8B Instruct (free)",
		contextLength: 131072,
		isFree: true,
		description: "Fast 8B parameter model from Meta. Free on OpenRouter.",
	},
	{
		id: "meta-llama/llama-3.1-70b-instruct:free",
		name: "Meta: Llama 3.1 70B Instruct (free)",
		contextLength: 131072,
		isFree: true,
		description:
			"High-capability 70B parameter model from Meta. Free on OpenRouter.",
	},
	{
		id: "meta-llama/llama-3.1-405b-instruct:free",
		name: "Meta: Llama 3.1 405B Instruct (free)",
		contextLength: 131072,
		isFree: true,
		description: "Flagship 405B parameter model from Meta. Free on OpenRouter.",
	},
	{
		id: "google/gemini-2.0-flash-exp:free",
		name: "Google: Gemini 2.0 Flash Experimental (free)",
		contextLength: 1048576,
		isFree: true,
		description:
			"Google Gemini 2.0 Flash with 1M context window. Free on OpenRouter.",
	},
	{
		id: "google/gemini-2.0-flash-thinking-exp:free",
		name: "Google: Gemini 2.0 Flash Thinking (free)",
		contextLength: 32768,
		isFree: true,
		description:
			"Gemini 2.0 reasoning model with chain of thought. Free on OpenRouter.",
	},
	{
		id: "deepseek/deepseek-r1:free",
		name: "DeepSeek: DeepSeek R1 (free)",
		contextLength: 64000,
		isFree: true,
		description:
			"DeepSeek R1 reasoning model with chain of thought. Free on OpenRouter.",
	},
	{
		id: "deepseek/deepseek-chat:free",
		name: "DeepSeek: DeepSeek V3 (free)",
		contextLength: 64000,
		isFree: true,
		description:
			"DeepSeek V3 671B MoE conversational model. Free on OpenRouter.",
	},
	{
		id: "qwen/qwen-2.5-72b-instruct:free",
		name: "Qwen: Qwen 2.5 72B Instruct (free)",
		contextLength: 32768,
		isFree: true,
		description:
			"High performance 72B open model by Alibaba. Free on OpenRouter.",
	},
	{
		id: "qwen/qwen-2.5-7b-instruct:free",
		name: "Qwen: Qwen 2.5 7B Instruct (free)",
		contextLength: 32768,
		isFree: true,
		description: "Fast 7B open model by Alibaba. Free on OpenRouter.",
	},
	{
		id: "mistralai/mistral-7b-instruct:free",
		name: "Mistral: Mistral 7B Instruct (free)",
		contextLength: 32768,
		isFree: true,
		description: "Fast and instruction-tuned 7B model. Free on OpenRouter.",
	},
	{
		id: "google/gemma-2-9b-it:free",
		name: "Google: Gemma 2 9B (free)",
		contextLength: 8192,
		isFree: true,
		description:
			"High performance lightweight 9B model from Google. Free on OpenRouter.",
	},
	{
		id: "openai/gpt-4o",
		name: "OpenAI: GPT-4o",
		contextLength: 128000,
		isFree: false,
		description: "OpenAI flagship multimodal intelligence model.",
	},
	{
		id: "openai/gpt-4o-mini",
		name: "OpenAI: GPT-4o-mini",
		contextLength: 128000,
		isFree: false,
		description: "Fast, affordable small model for everyday tasks.",
	},
	{
		id: "anthropic/claude-3.5-sonnet",
		name: "Anthropic: Claude 3.5 Sonnet",
		contextLength: 200000,
		isFree: false,
		description: "Industry-leading reasoning, coding, and comprehension.",
	},
	{
		id: "anthropic/claude-3.5-haiku",
		name: "Anthropic: Claude 3.5 Haiku",
		contextLength: 200000,
		isFree: false,
		description: "Ultra-fast, cost-effective reasoning from Anthropic.",
	},
	{
		id: "meta-llama/llama-3.3-70b-instruct",
		name: "Meta: Llama 3.3 70B Instruct",
		contextLength: 131072,
		isFree: false,
		description: "Meta's flagship 70B model with high throughput.",
	},
	{
		id: "deepseek/deepseek-r1",
		name: "DeepSeek: DeepSeek R1",
		contextLength: 64000,
		isFree: false,
		description: "DeepSeek R1 reasoning model with high speed and reliability.",
	},
];

export async function fetchOpenRouterModels(
	apiKey?: string,
	forceRefresh = false,
): Promise<OpenRouterModelInfo[]> {
	if (!forceRefresh) {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { timestamp, data } = JSON.parse(cached);
				if (
					Date.now() - timestamp < CACHE_TTL &&
					Array.isArray(data) &&
					data.length >= 5
				) {
					return data;
				}
			}
		} catch {
			// Ignore cache read errors
		}
	}

	const headers: Record<string, string> = {
		"HTTP-Referer":
			typeof window !== "undefined"
				? window.location.origin
				: "https://ias.app",
		"X-Title": "IAS Study Notes Generator",
	};
	if (apiKey?.trim()) {
		headers.Authorization = `Bearer ${apiKey.trim()}`;
	}

	let res: Response | null = null;

	// 1. Try direct OpenRouter API (public endpoint)
	try {
		res = await fetch("https://openrouter.ai/api/v1/models", { headers });
		// If 401/403 because of invalid key, retry without Authorization header
		if (res && (res.status === 401 || res.status === 403)) {
			res = await fetch("https://openrouter.ai/api/v1/models", {
				headers: {
					"HTTP-Referer": headers["HTTP-Referer"],
					"X-Title": headers["X-Title"],
				},
			});
		}
	} catch {
		// Network or CORS issue, fall back to backend proxy
	}

	// 2. Fallback to backend proxy (/api/openrouter/models)
	if (!res?.ok) {
		try {
			res = await fetch("/api/openrouter/models", { headers });
			if (res && (res.status === 401 || res.status === 403)) {
				res = await fetch("/api/openrouter/models");
			}
		} catch {
			// Proxy request failed
		}
	}

	// 3. Fallback to cached or default models if network/502/endpoint errors occur
	if (!res?.ok) {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { data } = JSON.parse(cached);
				if (Array.isArray(data) && data.length >= 5) {
					return data;
				}
			}
		} catch {
			// Ignore fallback cache errors
		}
		return DEFAULT_OPENROUTER_MODELS;
	}

	let data: Record<string, unknown> | null = null;
	try {
		data = (await res.json()) as Record<string, unknown>;
	} catch {
		return DEFAULT_OPENROUTER_MODELS;
	}

	const rawList = Array.isArray(data?.data) ? data.data : [];

	const models: OpenRouterModelInfo[] = rawList
		.filter(
			(m: unknown) =>
				typeof m === "object" &&
				m !== null &&
				"id" in m &&
				typeof (m as { id: unknown }).id === "string" &&
				(m as { id: string }).id.trim() !== "",
		)
		.map((m: unknown) => {
			const raw = m as Record<string, unknown>;
			const pricing =
				typeof raw.pricing === "object" && raw.pricing !== null
					? (raw.pricing as Record<string, unknown>)
					: {};
			const promptCost = Number(pricing.prompt ?? 0);
			const completionCost = Number(pricing.completion ?? 0);
			const requestCost = Number(pricing.request ?? 0);
			const imageCost = Number(pricing.image ?? 0);
			const modelId = String(raw.id);
			const isFree =
				modelId.endsWith(":free") ||
				(promptCost === 0 &&
					completionCost === 0 &&
					requestCost === 0 &&
					imageCost === 0);

			return {
				id: modelId,
				name:
					typeof raw.name === "string"
						? raw.name
						: (raw.name as unknown as string) || modelId,
				contextLength: Number(raw.context_length ?? 0),
				isFree,
				description: typeof raw.description === "string" ? raw.description : "",
				created: typeof raw.created === "number" ? raw.created : undefined,
			};
		})
		.sort(
			(a: OpenRouterModelInfo, b: OpenRouterModelInfo) =>
				Number(b.isFree) - Number(a.isFree) || a.name.localeCompare(b.name),
		);

	if (models.length === 0) {
		return DEFAULT_OPENROUTER_MODELS;
	}

	try {
		localStorage.setItem(
			CACHE_KEY,
			JSON.stringify({ timestamp: Date.now(), data: models }),
		);
	} catch {
		// Ignore cache write errors
	}

	return models;
}

export const DEFAULT_GENERAL_COMPUTE_MODELS: GeneralComputeModelInfo[] = [
	{
		id: "gpt-oss-120b",
		name: "GPT-OSS 120B",
		contextLength: 128000,
		isFree: false,
	},
	{
		id: "deepseek-v3.1",
		name: "DeepSeek V3.1",
		contextLength: 128000,
		isFree: false,
	},
	{
		id: "deepseek-v3.2",
		name: "DeepSeek V3.2",
		contextLength: 32000,
		isFree: false,
	},
	{
		id: "gemma-4-31B-it",
		name: "Gemma 4 31B-IT",
		contextLength: 128000,
		isFree: false,
	},
	{
		id: "minimax-m2.7",
		name: "MiniMax M2.7",
		contextLength: 192000,
		isFree: false,
	},
];

export async function fetchGeneralComputeModels(
	apiKey?: string,
	forceRefresh = false,
): Promise<GeneralComputeModelInfo[]> {
	if (!forceRefresh) {
		try {
			const cached = localStorage.getItem(GENERAL_COMPUTE_CACHE_KEY);
			if (cached) {
				const { timestamp, data } = JSON.parse(cached);
				if (
					Date.now() - timestamp < CACHE_TTL &&
					Array.isArray(data) &&
					data.length > 0
				) {
					return data;
				}
			}
		} catch {
			// Ignore cache read errors
		}
	}

	const headers: Record<string, string> = {};
	if (apiKey?.trim()) {
		headers.Authorization = `Bearer ${apiKey.trim()}`;
	}

	let res: Response | null = null;

	// Try direct public endpoint first (supports CORS)
	try {
		res = await fetch("https://api.generalcompute.com/v1/public/models", {
			headers,
		});
	} catch {
		// Network or CORS issue, fall back to backend proxy
	}

	// Fallback to backend proxy
	if (!res?.ok) {
		try {
			res = await fetch("/api/generalcompute/models", { headers });
		} catch {
			// Proxy request failed
		}
	}

	if (!res?.ok) {
		try {
			const cached = localStorage.getItem(GENERAL_COMPUTE_CACHE_KEY);
			if (cached) {
				const { data } = JSON.parse(cached);
				if (Array.isArray(data) && data.length > 0) {
					return data;
				}
			}
		} catch {
			// Ignore fallback cache errors
		}
		// Return resilient fallback models if network/endpoints are offline
		return DEFAULT_GENERAL_COMPUTE_MODELS;
	}

	const data = await res.json();
	const rawList = Array.isArray(data?.data)
		? data.data
		: Array.isArray(data)
			? data
			: [];

	const models: GeneralComputeModelInfo[] = rawList
		.filter(
			(m: unknown) =>
				typeof m === "object" &&
				m !== null &&
				"id" in m &&
				typeof (m as { id: unknown }).id === "string" &&
				(m as { id: string }).id.trim() !== "",
		)
		.map((m: unknown) => {
			const raw = m as Record<string, unknown>;
			const pricing =
				typeof raw.pricing === "object" && raw.pricing !== null
					? (raw.pricing as Record<string, unknown>)
					: {};
			const promptCost = Number(pricing.prompt ?? 0);
			const completionCost = Number(pricing.completion ?? 0);
			const isFree = promptCost === 0 && completionCost === 0;

			return {
				id: String(raw.id),
				name:
					typeof raw.name === "string" ? raw.name : String(raw.name ?? raw.id),
				description: typeof raw.description === "string" ? raw.description : "",
				contextLength: Number(raw.context_length ?? raw.max_tokens ?? 0),
				isFree,
				pricing: {
					prompt: promptCost,
					completion: completionCost,
				},
			};
		})
		.sort(
			(a: GeneralComputeModelInfo, b: GeneralComputeModelInfo) =>
				Number(b.isFree ?? 0) - Number(a.isFree ?? 0) ||
				a.name.localeCompare(b.name),
		);

	if (models.length === 0) {
		return DEFAULT_GENERAL_COMPUTE_MODELS;
	}

	try {
		localStorage.setItem(
			GENERAL_COMPUTE_CACHE_KEY,
			JSON.stringify({ timestamp: Date.now(), data: models }),
		);
	} catch {
		// Ignore cache write errors
	}

	return models;
}
