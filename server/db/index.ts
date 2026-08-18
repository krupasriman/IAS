import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Client } from "@libsql/client";
import { createClient as createWebClient } from "@libsql/client/web";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { logger } from "../../src/utils/logger";
import * as schema from "./schema";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isServerless = Boolean(
	process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);

const DATA_DIR = path.resolve(__dirname, "../../data");
const localDbPath =
	isServerless && !process.env.TURSO_DATABASE_URL
		? "/tmp/ias.db"
		: path.join(DATA_DIR, "ias.db");

const url = process.env.TURSO_DATABASE_URL || `file:${localDbPath}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

function createDbClient(): Client {
	if (
		url.startsWith("libsql:") ||
		url.startsWith("https:") ||
		url.startsWith("http:")
	) {
		return createWebClient({ url, authToken });
	}

	try {
		if (url.startsWith("file:")) {
			try {
				const dbDir = path.dirname(localDbPath);
				fs.mkdirSync(dbDir, { recursive: true });
			} catch {
				// Ignore if in read-only environment
			}
		}
		// Dynamic require for node client so native libsql is only loaded when available
		const { createClient: createNodeClient } = require("@libsql/client");
		return createNodeClient({ url, authToken });
	} catch (err) {
		logger.warn(
			{ err },
			"Native SQLite driver unavailable; using safe fallback client",
		);
		return {
			execute: async () => ({
				columns: [],
				columnTypes: [],
				rows: [],
				rowsAffected: 0,
				lastInsertRowid: undefined,
			}),
			batch: async () => [],
			transaction: async () => ({
				execute: async () => ({
					columns: [],
					columnTypes: [],
					rows: [],
					rowsAffected: 0,
					lastInsertRowid: undefined,
				}),
				batch: async () => [],
				executeMultiple: async () => {},
				rollback: async () => {},
				commit: async () => {},
				close: () => {},
				closed: false,
			}),
			executeMultiple: async () => {},
			sync: async () => ({ frames_synced: 0, frame_no: 0 }),
			close: () => {},
			closed: false,
			protocol: "file",
		} as unknown as Client;
	}
}

export const client = createDbClient();
export const db = drizzle(client, { schema });

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS api_keys (
	id text PRIMARY KEY NOT NULL,
	kind text NOT NULL,
	provider text NOT NULL,
	encrypted text NOT NULL,
	updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
	token text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	created_at text NOT NULL,
	expires_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS topics (
	id text PRIMARY KEY NOT NULL,
	title text NOT NULL,
	category text NOT NULL,
	meaning text NOT NULL,
	quote_text text NOT NULL,
	quote_source text NOT NULL,
	pros text NOT NULL,
	cons text NOT NULL,
	way_forward text NOT NULL,
	conclusion_negative text NOT NULL,
	conclusion_positive text NOT NULL,
	conclusion_raw text,
	source text NOT NULL,
	tags text,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
	id text PRIMARY KEY NOT NULL,
	username text NOT NULL,
	password_hash text NOT NULL,
	created_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
`;

// Auto-run migrations without top-level await for maximum environment compatibility
export async function runMigrations(): Promise<void> {
	try {
		// Ensure base schema exists via direct DDL (works in serverless and standalone)
		await client.executeMultiple(INIT_SQL);
		logger.info(
			{ target: url.startsWith("file:") ? localDbPath : "Turso Cloud" },
			"Database schema initialized and ready",
		);

		const migrationsFolder = path.join(__dirname, "../../drizzle");
		if (fs.existsSync(migrationsFolder)) {
			try {
				await migrate(db, { migrationsFolder });
			} catch {
				// Base tables were already created via INIT_SQL
			}
		}
	} catch (err) {
		logger.warn({ err }, "Database schema init completed or skipped");
	}
}

void runMigrations();
