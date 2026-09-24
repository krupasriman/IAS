import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import type { Topic } from "../../../src/types/topic.types";
import { logger } from "../../../src/utils/logger";

let redisClient: RedisClientType | null = null;
let isConnecting = false;

const memoryCache = new Map<string, { topic: Topic; expiresAt: number }>();
const MAX_MEMORY_ENTRIES = 500;
const DEFAULT_TTL_SECONDS = 86400; // 24 hours

async function getRedisClient(): Promise<RedisClientType | null> {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) return null;
	if (redisClient?.isOpen) return redisClient;
	if (isConnecting) return null;

	isConnecting = true;
	try {
		const client = createClient({ url: redisUrl });
		client.on("error", (err) => {
			logger.warn({ err: err.message }, "Redis cache client error");
		});
		await client.connect();
		redisClient = client as RedisClientType;
		logger.info("Deterministic LLM response caching backed by Redis");
		return redisClient;
	} catch (err) {
		logger.warn(
			{ err },
			"Redis connection failed; using in-memory response cache",
		);
		return null;
	} finally {
		isConnecting = false;
	}
}

export function generateTopicCacheKey(
	topic: string,
	category?: string,
	webContext?: string,
): string {
	const normalizedTopic = topic.trim().toLowerCase();
	const normalizedCat = (category || "").trim().toLowerCase();
	const contextSnippet = (webContext || "").trim().slice(0, 1000);
	const hash = createHash("sha256")
		.update(`${normalizedTopic}:${normalizedCat}:${contextSnippet}`)
		.digest("hex");
	return `llm:topic:${hash}`;
}

export async function getCachedTopic(key: string): Promise<Topic | null> {
	try {
		const redis = await getRedisClient();
		if (redis) {
			const raw = await redis.get(key);
			if (raw) {
				logger.info({ key }, "Redis LLM cache hit (<50ms)");
				return JSON.parse(raw) as Topic;
			}
		} else {
			const entry = memoryCache.get(key);
			if (entry && entry.expiresAt > Date.now()) {
				logger.info({ key }, "In-memory LLM cache hit");
				return entry.topic;
			}
			if (entry) memoryCache.delete(key);
		}
	} catch (err) {
		logger.warn(
			{ err, key },
			"Cache retrieval error; continuing with inference",
		);
	}
	return null;
}

export async function setCachedTopic(
	key: string,
	topic: Topic,
	ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
	try {
		const redis = await getRedisClient();
		if (redis) {
			await redis.set(key, JSON.stringify(topic), { EX: ttlSeconds });
		} else {
			if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
				const oldestKey = memoryCache.keys().next().value;
				if (oldestKey) memoryCache.delete(oldestKey);
			}
			memoryCache.set(key, {
				topic,
				expiresAt: Date.now() + ttlSeconds * 1000,
			});
		}
	} catch (err) {
		logger.warn({ err, key }, "Cache store error; continuing");
	}
}
