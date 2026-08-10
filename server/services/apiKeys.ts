import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { apiKeys } from "../db/schema.ts";
import { decryptSecret, encryptSecret } from "../utils/crypto.ts";

export type ApiKeyKind = "llm" | "search";

function keyId(kind: ApiKeyKind, provider: string): string {
	return `${kind}:${provider}`;
}

export async function storeApiKey(
	kind: ApiKeyKind,
	provider: string,
	value: string,
): Promise<void> {
	const id = keyId(kind, provider);
	const existing = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
	if (existing) {
		db.update(apiKeys)
			.set({
				encrypted: encryptSecret(value),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(apiKeys.id, id))
			.run();
	} else {
		db.insert(apiKeys)
			.values({
				id,
				kind,
				provider,
				encrypted: encryptSecret(value),
				updatedAt: new Date().toISOString(),
			})
			.run();
	}
}

export async function getApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<string | null> {
	const row = db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)))
		.get();
	if (!row) return null;
	try {
		return decryptSecret(row.encrypted);
	} catch {
		return null;
	}
}

export async function deleteApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	const result = db
		.delete(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)))
		.run();
	return result.changes > 0;
}

export async function hasApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	const row = db
		.select({ id: apiKeys.id })
		.from(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)))
		.get();
	return row !== undefined;
}

export async function listConfiguredApiKeys(): Promise<
	Record<ApiKeyKind, string[]>
> {
	const rows = db.select().from(apiKeys).all();
	const result: Record<ApiKeyKind, string[]> = { llm: [], search: [] };
	for (const row of rows) {
		if (row.kind === "llm" || row.kind === "search") {
			result[row.kind].push(row.provider);
		}
	}
	return result;
}
