import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { logger } from "../../src/utils/logger.ts";
import * as schema from "./schema.ts";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.resolve(__dirname, "../../data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "ias.db");

const url = process.env.TURSO_DATABASE_URL || `file:${LOCAL_DB_PATH}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (url.startsWith("file:")) {
	try {
		fs.mkdirSync(DATA_DIR, { recursive: true });
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
				{ target: url.startsWith("file:") ? LOCAL_DB_PATH : "Turso Cloud" },
				"Database migrations applied and ready",
			);
		}
	} catch (err) {
		logger.warn({ err }, "Database migration check completed or skipped");
	}
}

void runMigrations();
