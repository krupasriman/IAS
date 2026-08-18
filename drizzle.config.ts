import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "file:./data/ias.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
	schema: "./server/db/schema.ts",
	out: "./drizzle",
	dialect: url.startsWith("libsql") ? "turso" : "sqlite",
	dbCredentials: {
		url,
		...(authToken ? { authToken } : {}),
	},
});
