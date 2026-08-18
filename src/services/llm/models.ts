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
					data.length > 0
				) {
					return data;
				}
			}
		} catch {
			// Ignore cache read errors
		}
	}

	const url = "https://openrouter.ai/api/v1/models";
	const headers: Record<string, string> = {};
	if (apiKey?.trim()) {
		headers.Authorization = `Bearer ${apiKey.trim()}`;
	}

	const res = await fetch(url, { headers });
	if (!res.ok) {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { data } = JSON.parse(cached);
				if (Array.isArray(data) && data.length > 0) {
					return data;
				}
			}
		} catch {
			// Ignore fallback cache errors
		}
		throw new Error(
			`Failed to fetch OpenRouter models (${res.status} ${res.statusText})`,
		);
	}

	const data = await res.json();
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
			const isFree =
				promptCost === 0 &&
				completionCost === 0 &&
				requestCost === 0 &&
				imageCost === 0;

			return {
				id: String(raw.id),
				name:
					typeof raw.name === "string"
						? raw.name
						: (raw.name as unknown as string) || String(raw.id),
				contextLength: Number(raw.context_length ?? 0),
				isFree,
				description: typeof raw.description === "string" ? raw.description : "",
				created: raw.created,
			};
		})
		.sort(
			(a: OpenRouterModelInfo, b: OpenRouterModelInfo) =>
				Number(b.isFree) - Number(a.isFree) || a.name.localeCompare(b.name),
		);

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
