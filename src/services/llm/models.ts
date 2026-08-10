export interface OpenRouterModelInfo {
	id: string;
	name: string;
	contextLength: number;
	isFree: boolean;
	description?: string;
	created?: number;
}

export interface GoogleModelInfo {
	name: string;
	version: string;
	displayName: string;
	description: string;
	inputTokenLimit: number;
	outputTokenLimit: number;
	supportedGenerationMethods: string[];
	temperature?: number;
	topP?: number;
	topK?: number;
	isFree?: boolean;
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

const GOOGLE_CACHE_KEY = "ias_google_models_cache";

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

	// Use the server proxy endpoint to avoid CORS issues
	const url = "/api/generalcompute/models";
	const headers: Record<string, string> = {};
	if (apiKey?.trim()) {
		headers.Authorization = `Bearer ${apiKey.trim()}`;
	}

	const res = await fetch(url, { headers });
	if (!res.ok) {
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
		throw new Error(
			`Failed to fetch General Compute models (${res.status} ${res.statusText})`,
		);
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

export async function fetchGoogleModels(
	apiKey?: string,
	forceRefresh = false,
): Promise<GoogleModelInfo[]> {
	if (!forceRefresh) {
		try {
			const cached = localStorage.getItem(GOOGLE_CACHE_KEY);
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

	if (!apiKey?.trim()) {
		// Return known free models if no API key
		return getKnownGoogleModels();
	}

	const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`;
	const res = await fetch(url);

	if (!res.ok) {
		try {
			const cached = localStorage.getItem(GOOGLE_CACHE_KEY);
			if (cached) {
				const { data } = JSON.parse(cached);
				if (Array.isArray(data) && data.length > 0) {
					return data;
				}
			}
		} catch {
			// Ignore fallback cache errors
		}
		// Return known models as fallback
		return getKnownGoogleModels();
	}

	const data = await res.json();
	const rawList = Array.isArray(data?.models) ? data.models : [];

	const models: GoogleModelInfo[] = rawList
		.filter(
			(m: unknown) =>
				typeof m === "object" &&
				m !== null &&
				"name" in m &&
				typeof (m as { name: unknown }).name === "string",
		)
		.map((m: unknown) => {
			const raw = m as Record<string, unknown>;
			return {
				name: String(raw.name).replace("models/", ""),
				version: typeof raw.version === "string" ? raw.version : "",
				displayName:
					typeof raw.displayName === "string"
						? raw.displayName
						: String(raw.name),
				description: typeof raw.description === "string" ? raw.description : "",
				inputTokenLimit: Number(raw.inputTokenLimit ?? 0),
				outputTokenLimit: Number(raw.outputTokenLimit ?? 0),
				supportedGenerationMethods: Array.isArray(
					raw.supportedGenerationMethods,
				)
					? raw.supportedGenerationMethods
					: [],
				temperature: raw.temperature,
				topP: raw.topP,
				topK: raw.topK,
			};
		})
		.sort((a: GoogleModelInfo, b: GoogleModelInfo) =>
			a.displayName.localeCompare(b.displayName),
		);

	try {
		localStorage.setItem(
			GOOGLE_CACHE_KEY,
			JSON.stringify({ timestamp: Date.now(), data: models }),
		);
	} catch {
		// Ignore cache write errors
	}

	return models;
}

function getKnownGoogleModels(): GoogleModelInfo[] {
	// Known free models available on Google AI Studio free tier
	return [
		{
			name: "gemini-1.5-flash",
			version: "001",
			displayName: "Gemini 1.5 Flash",
			description:
				"Fast, versatile model with 1M token context. Free tier: 1500 req/min.",
			inputTokenLimit: 1048576,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
		{
			name: "gemini-1.5-flash-8b",
			version: "001",
			displayName: "Gemini 1.5 Flash-8B",
			description: "Smaller, faster variant of Flash. Free tier available.",
			inputTokenLimit: 1048576,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
		{
			name: "gemini-1.5-pro",
			version: "001",
			displayName: "Gemini 1.5 Pro",
			description:
				"Advanced reasoning with 2M token context. Free tier: 50 req/min.",
			inputTokenLimit: 2097152,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
		{
			name: "gemini-2.0-flash-exp",
			version: "001",
			displayName: "Gemini 2.0 Flash (Experimental)",
			description:
				"Next-gen model with improved speed and capabilities. Free tier available.",
			inputTokenLimit: 1048576,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
		{
			name: "gemini-2.0-flash-lite-preview",
			version: "001",
			displayName: "Gemini 2.0 Flash-Lite (Preview)",
			description:
				"Lightweight model optimized for cost-efficiency. Free tier available.",
			inputTokenLimit: 1048576,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
		{
			name: "gemini-exp-1206",
			version: "001",
			displayName: "Gemini Experimental 1206",
			description: "Latest experimental model. Free tier with limits.",
			inputTokenLimit: 1048576,
			outputTokenLimit: 8192,
			supportedGenerationMethods: ["generateContent", "streamGenerateContent"],
		},
	];
}
