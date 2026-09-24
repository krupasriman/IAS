import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { apiKeys } from "../db/schema";
import { decryptSecret, encryptSecret } from "../utils/crypto";

export type ApiKeyKind = "llm" | "search";

interface MemoryApiKey {
	encrypted: string;
	kind: ApiKeyKind;
	provider: string;
	userId: string;
}

const memoryApiKeys = new Map<string, MemoryApiKey>();

function keyId(userId: string, kind: ApiKeyKind, provider: string): string {
	return `${userId}:${kind}:${provider}`;
}

export async function storeApiKey(
	userId: string,
	kind: ApiKeyKind,
	provider: string,
	value: string,
): Promise<void> {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "sk-..." || trimmed === "gsk_...") {
		await deleteApiKey(userId, kind, provider);
		return;
	}
	const id = keyId(userId, kind, provider);
	const encrypted = encryptSecret(trimmed);
	// Always store in memory fallback
	memoryApiKeys.set(id, { encrypted, kind, provider, userId });

	try {
		const [existing] = await db
			.select()
			.from(apiKeys)
			.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
			.limit(1);

		if (existing) {
			await db
				.update(apiKeys)
				.set({
					encrypted,
					updatedAt: new Date().toISOString(),
				})
				.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
		} else {
			await db.insert(apiKeys).values({
				id,
				userId,
				kind,
				provider,
				encrypted,
				updatedAt: new Date().toISOString(),
			});
		}
	} catch {
		// Retained in memoryApiKeys on unconfigured or offline databases
	}
}

export async function getApiKey(
	userId: string,
	kind: ApiKeyKind,
	provider: string,
): Promise<string | null> {
	const id = keyId(userId, kind, provider);
	try {
		const [row] = await db
			.select()
			.from(apiKeys)
			.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
			.limit(1);

		if (row) {
			return decryptSecret(row.encrypted);
		}
	} catch {
		// Fall through to memory store
	}

	const mem = memoryApiKeys.get(id);
	if (mem) {
		try {
			return decryptSecret(mem.encrypted);
		} catch {
			return null;
		}
	}
	return null;
}

export async function deleteApiKey(
	userId: string,
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	const id = keyId(userId, kind, provider);
	const memDeleted = memoryApiKeys.delete(id);
	try {
		const result = await db
			.delete(apiKeys)
			.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
		return (result.rowCount ?? 0) > 0 || memDeleted;
	} catch {
		return memDeleted;
	}
}

export async function hasApiKey(
	userId: string,
	kind: ApiKeyKind,
	provider: string,
): Promise<boolean> {
	const id = keyId(userId, kind, provider);
	if (memoryApiKeys.has(id)) return true;
	try {
		const [row] = await db
			.select({ id: apiKeys.id })
			.from(apiKeys)
			.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
			.limit(1);
		return row !== undefined;
	} catch {
		return false;
	}
}

export async function listConfiguredApiKeys(
	userId: string,
): Promise<Record<ApiKeyKind, string[]>> {
	const result: Record<ApiKeyKind, string[]> = { llm: [], search: [] };

	// 1. Gather from memory fallback
	for (const entry of memoryApiKeys.values()) {
		if (
			entry.userId === userId &&
			(entry.kind === "llm" || entry.kind === "search")
		) {
			try {
				const decrypted = decryptSecret(entry.encrypted);
				if (
					decrypted?.trim() &&
					decrypted !== "sk-..." &&
					decrypted !== "gsk_..."
				) {
					result[entry.kind].push(entry.provider);
				}
			} catch {
				// Invalid decryption, skip
			}
		}
	}

	// 2. Gather from DB
	try {
		const rows = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.userId, userId));
		for (const row of rows) {
			if (row.kind === "llm" || row.kind === "search") {
				try {
					const decrypted = decryptSecret(row.encrypted);
					if (
						decrypted?.trim() &&
						decrypted !== "sk-..." &&
						decrypted !== "gsk_..."
					) {
						if (!result[row.kind].includes(row.provider)) {
							result[row.kind].push(row.provider);
						}
					}
				} catch {
					// Invalid decryption, skip
				}
			}
		}
	} catch {
		// Ignore DB read failure; return what memoryApiKeys has
	}

	return result;
}
