import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";
import { logger } from "../../src/utils/logger.ts";

let redisClient: RedisClientType | null = null;

const REDIS_CONNECT_TIMEOUT_MS = 2000;

async function connectRedis(url: string): Promise<RedisClientType | null> {
	const client = createClient({ url });
	client.on("error", (err) => {
		logger.warn({ err: err.message }, "Redis client error");
	});
	try {
		await Promise.race([
			client.connect(),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("connection timed out")),
					REDIS_CONNECT_TIMEOUT_MS,
				),
			),
		]);
		logger.info("Rate limiting backed by Redis");
		return client as RedisClientType;
	} catch (err: unknown) {
		logger.warn(
			{ err: err instanceof Error ? err.message : String(err) },
			"Redis connection failed; falling back to in-memory rate limit",
		);
		try {
			await client.disconnect();
		} catch {
			// best-effort cleanup
		}
		return null;
	}
}

export async function createApiLimiter(
	max = process.env.NODE_ENV === "production" ? 100 : 2000,
) {
	const windowMs = 15 * 60 * 1000; // 15 minutes
	const base = {
		windowMs,
		max,
		message: { error: "Too many requests, please try again later" },
		standardHeaders: true,
		legacyHeaders: false,
	} as const;

	const redisUrl = process.env.REDIS_URL;
	if (redisUrl) {
		const client = await connectRedis(redisUrl);
		if (client) {
			redisClient = client;
			return rateLimit({
				...base,
				store: new RedisStore({
					sendCommand: (...args: string[]) => client.sendCommand(args),
				}),
			});
		}
	}

	return rateLimit(base);
}

export async function closeRedis(): Promise<void> {
	const client = redisClient;
	redisClient = null;
	if (client) {
		try {
			await client.quit();
		} catch {
			// best-effort shutdown
		}
	}
}
