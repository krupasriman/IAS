import { getApiKey } from "./apiKeys";

export async function resolveLlmApiKey(
	provider: string,
	requestKey?: string,
): Promise<string | null> {
	if (requestKey) return requestKey;
	return getApiKey("llm", provider);
}
