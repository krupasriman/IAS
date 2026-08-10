import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { PROVIDER_DEFAULTS } from "./providerDefaults.ts";

export type LLMProvider = "openrouter" | "groq" | "generalcompute";

export interface ProviderConfig {
	provider: LLMProvider;
	apiKey: string;
	model: string;
	baseUrl?: string;
}

export function getLanguageModel(config: ProviderConfig): LanguageModel {
	const { provider, apiKey, model, baseUrl } = config;
	const url = (baseUrl || PROVIDER_DEFAULTS[provider]).replace(/\/$/, "");

	const compat = createOpenAICompatible({
		name: provider,
		apiKey,
		baseURL: url,
	});
	return compat(model);
}
