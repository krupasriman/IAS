const API_BASE = "/api/settings";

export interface ConfiguredKeys {
	llm: string[];
	search: string[];
}

export interface ApiKeyStatusResponse {
	hasConfiguredKey: boolean;
	configured: ConfiguredKeys;
	userId?: string;
}

export async function fetchApiKeyStatus(): Promise<ApiKeyStatusResponse> {
	try {
		const res = await fetch(`${API_BASE}/api-keys/status`);
		if (res.status === 429 || !res.ok) {
			return { hasConfiguredKey: false, configured: { llm: [], search: [] } };
		}
		const data = (await res.json()) as ApiKeyStatusResponse;
		return {
			hasConfiguredKey: Boolean(data.hasConfiguredKey),
			configured: data.configured ?? { llm: [], search: [] },
			userId: data.userId,
		};
	} catch {
		return { hasConfiguredKey: false, configured: { llm: [], search: [] } };
	}
}

export async function validateServerApiKey(
	kind: "llm" | "search",
	provider: string,
	value: string,
): Promise<{ valid: boolean; error?: string }> {
	try {
		const res = await fetch(`${API_BASE}/api-keys/validate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ kind, provider, value }),
		});
		const data = (await res.json().catch(() => ({}))) as {
			ok?: boolean;
			error?: string;
		};
		if (!res.ok || data.ok === false) {
			return {
				valid: false,
				error: data.error || `Validation failed (${res.status})`,
			};
		}
		return { valid: true };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { valid: false, error: msg };
	}
}

export async function storeServerApiKey(
	kind: "llm" | "search",
	provider: string,
	value: string,
	validate = true,
): Promise<{ hasConfiguredKey: boolean }> {
	const res = await fetch(`${API_BASE}/api-keys`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kind, provider, value, validate }),
	});
	if (!res.ok) {
		const errBody = (await res.json().catch(() => ({}))) as {
			error?: string;
			message?: string;
		};
		const errMsg =
			errBody.error ||
			errBody.message ||
			`Failed to store API key: ${res.status}`;
		throw new Error(errMsg);
	}
	const data = (await res.json().catch(() => ({}))) as {
		hasConfiguredKey?: boolean;
	};
	return { hasConfiguredKey: Boolean(data.hasConfiguredKey) };
}

export async function deleteServerApiKey(
	kind: "llm" | "search",
	provider: string,
): Promise<void> {
	const res = await fetch(
		`${API_BASE}/api-keys/${kind}/${encodeURIComponent(provider)}`,
		{ method: "DELETE" },
	);
	if (!res.ok) {
		throw new Error(`Failed to delete API key: ${res.status}`);
	}
}
