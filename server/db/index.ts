import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { logger } from "../../src/utils/logger";
import * as schema from "./schema";

dotenv.config();

const { Pool } = pg;

const databaseUrl =
	process.env.DATABASE_URL ||
	"postgresql://postgres:postgres@localhost:5432/ias";

const isNeonOrSupabase =
	databaseUrl.includes("neon.tech") ||
	databaseUrl.includes("supabase.co") ||
	databaseUrl.includes("pooler.supabase.com");

const isSslRequired =
	isNeonOrSupabase ||
	process.env.DATABASE_SSL === "true" ||
	databaseUrl.includes("sslmode=require");

export const pool = new Pool({
	connectionString: databaseUrl,
	ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
	logger.error({ err: err.message }, "Unexpected idle PostgreSQL client error");
});

export const db = drizzle(pool, { schema });

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY NOT NULL,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	salt TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	token TEXT PRIMARY KEY NOT NULL,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TEXT NOT NULL,
	expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
	id TEXT PRIMARY KEY NOT NULL,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	category TEXT NOT NULL,
	meaning TEXT NOT NULL,
	quote_text TEXT NOT NULL,
	quote_source TEXT NOT NULL,
	pros TEXT NOT NULL,
	cons TEXT NOT NULL,
	way_forward TEXT NOT NULL,
	conclusion_negative TEXT NOT NULL,
	conclusion_positive TEXT NOT NULL,
	conclusion_raw TEXT,
	source TEXT NOT NULL,
	tags TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
	id TEXT PRIMARY KEY NOT NULL,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	provider TEXT NOT NULL,
	encrypted TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS topics_user_id_idx ON topics(user_id);
CREATE INDEX IF NOT EXISTS topics_category_idx ON topics(user_id, category);
CREATE INDEX IF NOT EXISTS topics_user_updated_idx ON topics(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS topics_user_cat_updated_idx ON topics(user_id, category, updated_at DESC);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_kind_provider_idx ON api_keys(user_id, kind, provider);
`;

export async function runMigrations(): Promise<void> {
	if (!process.env.DATABASE_URL) {
		logger.warn(
			"DATABASE_URL is not configured. Using fallback local connection; PostgreSQL operations may fail if server is not running.",
		);
	}
	try {
		const client = await pool.connect();
		try {
			await client.query(INIT_SQL);
			logger.info("PostgreSQL schema initialized and verified successfully");
		} finally {
			client.release();
		}
	} catch (err) {
		logger.warn(
			{ err: err instanceof Error ? err.message : String(err) },
			"PostgreSQL schema initialization deferred or connection unavailable",
		);
	}
}

void runMigrations();
