import { ChatOpenAI } from "@langchain/openai";
import type { ProviderConfig } from "./provider";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_TEMPERATURE,
	PROVIDER_DEFAULTS,
} from "./providerDefaults";

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

	const defaultHeaders: Record<string, string> = {};
	if (provider === "openrouter") {
		defaultHeaders["HTTP-Referer"] = "https://ias-black.vercel.app";
		defaultHeaders["X-Title"] = "IAS Study Notes Generator";
	}

	return new ChatOpenAI({
		model,
		apiKey,
		temperature: DEFAULT_TEMPERATURE,
		maxTokens: DEFAULT_MAX_TOKENS,
		configuration: { baseURL, defaultHeaders },
	});
}
