import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "../../src/utils/logger";

dotenv.config();

const EnvSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3001),
	DATABASE_URL: z.string().optional(),
	AUTH_MODE: z.enum(["local", "session"]).default("local"),
	ENCRYPTION_KEY: z.string().optional(),
	REDIS_URL: z.string().optional(),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
		.default("info"),
	ALLOWED_ORIGINS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

function validateEnv(): EnvConfig {
	const result = EnvSchema.safeParse(process.env);

	if (!result.success) {
		const formatted = result.error.issues
			.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		logger.fatal(`\n[FATAL] Environment configuration error:\n${formatted}\n`);
		if (process.env.NODE_ENV !== "test") {
			process.exit(1);
		}
		throw new Error(`Environment configuration invalid:\n${formatted}`);
	}

	const config = result.data;

	// Production invariants
	if (config.NODE_ENV === "production") {
		if (!config.ENCRYPTION_KEY) {
			logger.fatal(
				"[FATAL] ENCRYPTION_KEY must be provided in production to prevent key rotation data loss.",
			);
			if (process.env.NODE_ENV !== "test") {
				process.exit(1);
			}
		}
		if (!config.DATABASE_URL) {
			logger.warn(
				"[WARN] DATABASE_URL is not set in production. Database operations will fail.",
			);
		}
	}

	return config;
}

export const env = validateEnv();
