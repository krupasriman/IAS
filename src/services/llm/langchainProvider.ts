import { ChatOpenAI } from "@langchain/openai";
import type { ProviderConfig } from "./provider.ts";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_TEMPERATURE,
	PROVIDER_DEFAULTS,
} from "./providerDefaults.ts";

/**
 * Builds a LangChain `ChatOpenAI` bound to an OpenAI-compatible endpoint.
 *
 * OpenRouter, Groq and GeneralCompute all speak the OpenAI chat format, so a
 * single `ChatOpenAI` (with `configuration.baseURL`) covers every configured
 * provider. `temperature`/`maxTokens` mirror the defaults previously applied by
 * the AI-SDK provider so behavior stays consistent.
 */
export function getLangChainModel(config: ProviderConfig): ChatOpenAI {
	const { provider, apiKey, model, baseUrl } = config;
	const baseURL = (baseUrl || PROVIDER_DEFAULTS[provider]).replace(/\/$/, "");

	return new ChatOpenAI({
		model,
		apiKey,
		temperature: DEFAULT_TEMPERATURE,
		maxTokens: DEFAULT_MAX_TOKENS,
		configuration: { baseURL },
	});
}
