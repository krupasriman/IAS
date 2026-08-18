import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

export interface AuthUser {
	id: string;
	username: string;
}

export const SESSION_COOKIE = "ias_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Auth mode: "local" (no login required, single-user) or "session" (password login)
export function isAuthEnabled(): boolean {
	return process.env.AUTH_MODE === "session";
}

function hashPassword(password: string): string {
	return createHash("sha256").update(password).digest("hex");
}

export async function verifyCredentials(
	username: string,
	password: string,
): Promise<AuthUser | null> {
	const [row] = await db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.limit(1);

	if (!row) return null;
	const expected = Buffer.from(row.passwordHash, "hex");
	const actual = Buffer.from(hashPassword(password), "hex");
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		return null;
	}
	return { id: row.id, username: row.username };
}

export async function createSession(user: AuthUser): Promise<string> {
	const token = randomBytes(32).toString("hex");
	await db.insert(sessions).values({
		token,
		userId: user.id,
		createdAt: new Date().toISOString(),
		expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
	});
	return token;
}

export async function destroySession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
	if (!token) return null;
	const [row] = await db
		.select()
		.from(sessions)
		.where(eq(sessions.token, token))
		.limit(1);

	if (!row) return null;
	if (new Date(row.expiresAt).getTime() < Date.now()) {
		await db.delete(sessions).where(eq(sessions.token, token));
		return null;
	}
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, row.userId))
		.limit(1);

	return user ? { id: user.id, username: user.username } : null;
}
