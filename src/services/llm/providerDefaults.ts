import type { LLMProvider } from "../../types/settings.types";

export const PROVIDER_DEFAULTS: Record<LLMProvider, string> = {
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
	generalcompute: "https://api.generalcompute.com/v1",
};

export const DEFAULT_MAX_TOKENS = 2500;
export const DEFAULT_TEMPERATURE = 0.2;
