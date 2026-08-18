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
	try {
		const id = keyId(kind, provider);
		const [existing] = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.id, id))
			.limit(1);

		if (existing) {
			await db
				.update(apiKeys)
				.set({
					encrypted: encryptSecret(value),
					updatedAt: new Date().toISOString(),
				})
				.where(eq(apiKeys.id, id));
		} else {
			await db.insert(apiKeys).values({
				id,
				kind,
				provider,
				encrypted: encryptSecret(value),
				updatedAt: new Date().toISOString(),
			});
		}
	} catch {
		// Ignore store failure on unconfigured databases
	}
}

export async function getApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<string | null> {
	try {
		const [row] = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.id, keyId(kind, provider)))
			.limit(1);

		if (!row) return null;
		return decryptSecret(row.encrypted);
	} catch {
		return null;
	}
}

export async function deleteApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	try {
		const result = await db
			.delete(apiKeys)
			.where(eq(apiKeys.id, keyId(kind, provider)));
		return (result.rowsAffected ?? 1) > 0;
	} catch {
		return false;
	}
}

export async function hasApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	try {
		const [row] = await db
			.select({ id: apiKeys.id })
			.from(apiKeys)
			.where(eq(apiKeys.id, keyId(kind, provider)))
			.limit(1);
		return row !== undefined;
	} catch {
		return false;
	}
}

export async function listConfiguredApiKeys(): Promise<
	Record<ApiKeyKind, string[]>
> {
	try {
		const rows = await db.select().from(apiKeys);
		const result: Record<ApiKeyKind, string[]> = { llm: [], search: [] };
		for (const row of rows) {
			if (row.kind === "llm" || row.kind === "search") {
				result[row.kind].push(row.provider);
			}
		}
		return result;
	} catch {
		return { llm: [], search: [] };
	}
}
