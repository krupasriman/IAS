const API_BASE = "/api/settings";

export interface ConfiguredKeys {
	llm: string[];
	search: string[];
}

export async function fetchConfiguredKeys(): Promise<ConfiguredKeys> {
	try {
		const res = await fetch(`${API_BASE}/api-keys`);
		if (res.status === 429 || !res.ok) {
			return { llm: [], search: [] };
		}
		const text = await res.text();
		const data = (text ? JSON.parse(text) : {}) as {
			configured?: ConfiguredKeys;
		};
		return data.configured ?? { llm: [], search: [] };
	} catch {
		return { llm: [], search: [] };
	}
}

export async function storeServerApiKey(
	kind: "llm" | "search",
	provider: string,
	value: string,
): Promise<void> {
	const res = await fetch(`${API_BASE}/api-keys`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ kind, provider, value }),
	});
	if (!res.ok) {
		throw new Error(`Failed to store API key: ${res.status}`);
	}
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
