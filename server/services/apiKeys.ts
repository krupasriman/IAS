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
}

export async function getApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<string | null> {
	const [row] = await db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)))
		.limit(1);

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
	const result = await db
		.delete(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)));
	return (result.rowsAffected ?? 1) > 0;
}

export async function hasApiKey(
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: apiKeys.id })
		.from(apiKeys)
		.where(eq(apiKeys.id, keyId(kind, provider)))
		.limit(1);
	return row !== undefined;
}

export async function listConfiguredApiKeys(): Promise<
	Record<ApiKeyKind, string[]>
> {
	const rows = await db.select().from(apiKeys);
	const result: Record<ApiKeyKind, string[]> = { llm: [], search: [] };
	for (const row of rows) {
		if (row.kind === "llm" || row.kind === "search") {
			result[row.kind].push(row.provider);
		}
	}
	return result;
}
