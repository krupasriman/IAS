import { getApiKey } from "./apiKeys";

export async function resolveLlmApiKey(
	provider: string,
	requestKey?: string,
): Promise<string | null> {
	if (requestKey?.trim()) return requestKey.trim();
	const stored = await getApiKey("llm", provider);
	return stored?.trim() ? stored.trim() : null;
}
