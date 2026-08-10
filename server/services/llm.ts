import type { ProviderConfig } from "../../src/services/llm/provider.ts";

export { getLanguageModel } from "../../src/services/llm/provider.ts";
export {
	DEFAULT_MAX_TOKENS,
	DEFAULT_TEMPERATURE,
	PROVIDER_DEFAULTS,
} from "../../src/services/llm/providerDefaults.ts";

export type { ProviderConfig };

export function buildChatCompletionUrl(
	_provider: string,
	_baseUrl?: string,
): string {
	throw new Error(
		"buildChatCompletionUrl is deprecated; use getLanguageModel() from AI SDK",
	);
}

export function buildChatCompletionHeaders(
	_request: Record<string, unknown>,
): Record<string, string> {
	throw new Error(
		"buildChatCompletionHeaders is deprecated; use getLanguageModel() from AI SDK",
	);
}

export function buildChatCompletionBody(
	_request: Record<string, unknown>,
	_structured = false,
): Record<string, unknown> {
	throw new Error(
		"buildChatCompletionBody is deprecated; use generateObject/streamText from AI SDK",
	);
}

export async function proxyChatCompletion(
	_request: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
	throw new Error(
		"proxyChatCompletion is deprecated; use generateText from AI SDK",
	);
}

export function _configFromLegacy(request: {
	provider: string;
	apiKey: string;
	model: string;
	baseUrl?: string;
}): ProviderConfig {
	return {
		provider: request.provider as ProviderConfig["provider"],
		apiKey: request.apiKey,
		model: request.model,
		baseUrl: request.baseUrl,
	};
}
