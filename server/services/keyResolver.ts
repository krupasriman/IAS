import { getApiKey } from "./apiKeys";

const DEFAULT_LOCAL_USER_ID = "usr_local_admin_0000000000";

export async function resolveLlmApiKey(
	provider: string,
	requestKey?: string,
	userId: string = DEFAULT_LOCAL_USER_ID,
): Promise<string | null> {
	if (requestKey?.trim()) return requestKey.trim();
	const stored = await getApiKey(userId, "llm", provider);
	return stored?.trim() ? stored.trim() : null;
}
