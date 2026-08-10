import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { sessions, users } from "../db/schema.ts";

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
	const row = db.select().from(users).where(eq(users.username, username)).get();
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
	db.insert(sessions)
		.values({
			token,
			userId: user.id,
			createdAt: new Date().toISOString(),
			expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
		})
		.run();
	return token;
}

export async function destroySession(token: string): Promise<void> {
	db.delete(sessions).where(eq(sessions.token, token)).run();
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
	if (!token) return null;
	const row = db.select().from(sessions).where(eq(sessions.token, token)).get();
	if (!row) return null;
	if (new Date(row.expiresAt).getTime() < Date.now()) {
		db.delete(sessions).where(eq(sessions.token, token)).run();
		return null;
	}
	const user = db.select().from(users).where(eq(users.id, row.userId)).get();
	return user ? { id: user.id, username: user.username } : null;
}
