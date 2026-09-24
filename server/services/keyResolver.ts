import { getApiKey } from "./apiKeys";

const DEFAULT_LOCAL_USER_ID = "usr_local_admin_0000000000";

export async function resolveLlmApiKey(
	provider: string,
	requestKey?: string,
	userId: string = DEFAULT_LOCAL_USER_ID,
): Promise<string | null> {
	const raw =
		requestKey?.trim() || (await getApiKey(userId, "llm", provider))?.trim();
	if (!raw) return null;
	return raw
		.replace(/^Bearer\s+/i, "")
		.replace(/^["']|["']$/g, "")
		.trim();
}
