import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
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

if (url.startsWith("file:")) {
	try {
		const dbDir = path.dirname(localDbPath);
		fs.mkdirSync(dbDir, { recursive: true });
	} catch {
		// Ignore if in read-only environment
	}
}

export const client = createClient({
	url,
	authToken,
});

export const db = drizzle(client, { schema });

// Auto-run migrations without top-level await for maximum environment compatibility
export async function runMigrations(): Promise<void> {
	try {
		const migrationsFolder = path.join(__dirname, "../../drizzle");
		if (fs.existsSync(migrationsFolder)) {
			await migrate(db, { migrationsFolder });
			logger.info(
				{ target: url.startsWith("file:") ? localDbPath : "Turso Cloud" },
				"Database migrations applied and ready",
			);
		}
	} catch (err) {
		logger.warn({ err }, "Database migration check completed or skipped");
	}
}

void runMigrations();
