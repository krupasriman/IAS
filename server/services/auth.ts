import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { logger } from "../../src/utils/logger";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

export interface AuthUser {
	id: string;
	username: string;
	role: string;
}

export const SESSION_COOKIE = "ias_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isAuthEnabled(): boolean {
	return process.env.AUTH_MODE === "session";
}

function deriveKey(password: string, salt: string): Buffer {
	return scryptSync(password, salt, 64);
}

export async function createUser(
	username: string,
	password: string,
	role: "admin" | "user" = "user",
): Promise<AuthUser> {
	const salt = randomBytes(16).toString("hex");
	const passwordHash = deriveKey(password, salt).toString("hex");
	const id = `user_${randomBytes(12).toString("hex")}`;
	const createdAt = new Date().toISOString();

	await db.insert(users).values({
		id,
		username,
		passwordHash,
		salt,
		role,
		createdAt,
	});

	return { id, username, role };
}

export async function verifyCredentials(
	username: string,
	password: string,
): Promise<AuthUser | null> {
	try {
		const [row] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!row) return null;

		const derived = deriveKey(password, row.salt);
		const expected = Buffer.from(row.passwordHash, "hex");

		if (
			derived.length !== expected.length ||
			!timingSafeEqual(derived, expected)
		) {
			return null;
		}

		return { id: row.id, username: row.username, role: row.role };
	} catch (err) {
		logger.error({ err }, "Database error during verifyCredentials");
		return null;
	}
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
	try {
		await db.delete(sessions).where(eq(sessions.token, token));
	} catch (err) {
		logger.error({ err }, "Error destroying session");
	}
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
	if (!token) return null;
	try {
		const [sessionRow] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.token, token))
			.limit(1);

		if (!sessionRow) return null;
		if (new Date(sessionRow.expiresAt).getTime() < Date.now()) {
			await db.delete(sessions).where(eq(sessions.token, token));
			return null;
		}

		const [userRow] = await db
			.select()
			.from(users)
			.where(eq(users.id, sessionRow.userId))
			.limit(1);

		return userRow
			? { id: userRow.id, username: userRow.username, role: userRow.role }
			: null;
	} catch (err) {
		logger.warn({ err }, "Error retrieving session user");
		return null;
	}
}

const LOCAL_ADMIN_USERNAME = "local_admin";
const DEFAULT_LOCAL_USER_ID = "usr_local_admin_0000000000";

/**
 * Returns a stable local admin user for single-tenant local mode,
 * creating it in PostgreSQL if not already present.
 */
export async function getOrCreateLocalUser(): Promise<AuthUser> {
	try {
		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.username, LOCAL_ADMIN_USERNAME))
			.limit(1);

		if (existing) {
			return {
				id: existing.id,
				username: existing.username,
				role: existing.role,
			};
		}

		const salt = randomBytes(16).toString("hex");
		const passwordHash = deriveKey("local_admin_password", salt).toString(
			"hex",
		);
		const now = new Date().toISOString();

		await db.insert(users).values({
			id: DEFAULT_LOCAL_USER_ID,
			username: LOCAL_ADMIN_USERNAME,
			passwordHash,
			salt,
			role: "admin",
			createdAt: now,
		});

		return {
			id: DEFAULT_LOCAL_USER_ID,
			username: LOCAL_ADMIN_USERNAME,
			role: "admin",
		};
	} catch (err) {
		logger.warn(
			{ err },
			"Fallback in-memory local admin user used (Postgres might be initializing)",
		);
		return {
			id: DEFAULT_LOCAL_USER_ID,
			username: LOCAL_ADMIN_USERNAME,
			role: "admin",
		};
	}
}
