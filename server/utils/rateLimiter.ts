import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";
import { logger } from "../../src/utils/logger";

let redisClient: RedisClientType | null = null;
let connectingPromise: Promise<RedisClientType | null> | null = null;

const REDIS_CONNECT_TIMEOUT_MS = 2000;

async function getRedisClient(): Promise<RedisClientType | null> {
	if (redisClient) return redisClient;
	if (connectingPromise) return connectingPromise;

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) return null;

	connectingPromise = (async () => {
		const client = createClient({ url: redisUrl });
		client.on("error", (err) => {
			logger.warn({ err: err.message }, "Redis client error in rateLimiter");
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
			redisClient = client as RedisClientType;
			return redisClient;
		} catch (err: unknown) {
			logger.warn(
				{ err: err instanceof Error ? err.message : String(err) },
				"Redis connection failed; falling back to in-memory rate limiting",
			);
			try {
				await client.disconnect();
			} catch {
				// best-effort cleanup
			}
			return null;
		} finally {
			connectingPromise = null;
		}
	})();

	return connectingPromise;
}

function makeLimiter(opts: {
	windowMs: number;
	max: number;
	prefix: string;
	message: string;
	keyGenerator?: (req: Request) => string;
	client: RedisClientType | null;
}) {
	const base = {
		windowMs: opts.windowMs,
		max: opts.max,
		message: { error: opts.message },
		standardHeaders: true,
		legacyHeaders: false,
		validate: { xForwardedForHeader: false, default: false },
		keyGenerator: opts.keyGenerator,
	};

	const redis = opts.client;
	if (redis) {
		return rateLimit({
			...base,
			store: new RedisStore({
				prefix: `rl:${opts.prefix}:`,
				sendCommand: (...args: string[]) => redis.sendCommand(args),
			}),
		});
	}

	return rateLimit(base);
}

export async function createTieredLimiters() {
	const client = await getRedisClient();
	const isProd = process.env.NODE_ENV === "production";

	const authLimiter = makeLimiter({
		windowMs: 60 * 1000,
		max: isProd ? 5 : 100,
		prefix: "auth",
		message:
			"Too many authentication attempts, please try again after a minute",
		keyGenerator: (req) => req.ip || "unknown",
		client,
	});

	const generationLimiter = makeLimiter({
		windowMs: 60 * 1000,
		max: isProd ? 10 : 200,
		prefix: "gen",
		message:
			"Generation rate limit reached, please wait a minute before generating more notes",
		keyGenerator: (req) => req.authUser?.id || req.ip || "unknown",
		client,
	});

	const apiLimiter = makeLimiter({
		windowMs: 15 * 60 * 1000,
		max: isProd ? 300 : 3000,
		prefix: "api",
		message: "Too many requests, please try again later",
		keyGenerator: (req) => req.authUser?.id || req.ip || "unknown",
		client,
	});

	return { authLimiter, generationLimiter, apiLimiter };
}

export async function createApiLimiter() {
	const { apiLimiter } = await createTieredLimiters();
	return apiLimiter;
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
