import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import type { Topic } from "../../src/types/topic.types.ts";
import { logger } from "../../src/utils/logger.ts";
import { db } from "../db/index.ts";
import { topics } from "../db/schema.ts";

interface TopicRow {
	id: string;
	title: string;
	category: string;
	meaning: string;
	quoteText: string;
	quoteSource: string;
	pros: string;
	cons: string;
	wayForward: string;
	conclusionNegative: string;
	conclusionPositive: string;
	conclusionRaw: string | null;
	source: string;
	tags: string | null;
	createdAt: string;
	updatedAt: string;
}

function toTopic(row: TopicRow): Topic {
	return {
		id: row.id,
		title: row.title,
		category: row.category as Topic["category"],
		meaning: row.meaning,
		quote: { text: row.quoteText, source: row.quoteSource },
		pros: JSON.parse(row.pros),
		cons: JSON.parse(row.cons),
		wayForward: (() => {
			try {
				const parsed = JSON.parse(row.wayForward);
				if (Array.isArray(parsed)) return parsed;
				return [String(parsed)];
			} catch {
				return [row.wayForward];
			}
		})(),
		conclusion: row.conclusionRaw
			? row.conclusionRaw
			: {
					negative: row.conclusionNegative,
					positive: row.conclusionPositive,
				},
		source: row.source as Topic["source"],
		tags: row.tags ? JSON.parse(row.tags) : undefined,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function fromTopic(topic: Topic): Omit<TopicRow, "createdAt" | "updatedAt"> {
	return {
		id: topic.id,
		title: topic.title,
		category: topic.category,
		meaning: topic.meaning,
		quoteText: topic.quote.text,
		quoteSource: topic.quote.source,
		pros: JSON.stringify(topic.pros),
		cons: JSON.stringify(topic.cons),
		wayForward: JSON.stringify(topic.wayForward),
		conclusionNegative:
			typeof topic.conclusion === "string" ? "" : topic.conclusion.negative,
		conclusionPositive:
			typeof topic.conclusion === "string" ? "" : topic.conclusion.positive,
		conclusionRaw:
			typeof topic.conclusion === "string" ? topic.conclusion : null,
		source: topic.source,
		tags: topic.tags ? JSON.stringify(topic.tags) : null,
	};
}

function getSeedTopics(): Topic[] {
	try {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const possiblePaths = [
			path.resolve(__dirname, "../../public/data/topics.json"),
			path.resolve(__dirname, "../../dist/data/topics.json"),
		];
		for (const seedPath of possiblePaths) {
			if (fs.existsSync(seedPath)) {
				return JSON.parse(fs.readFileSync(seedPath, "utf8")) as Topic[];
			}
		}
	} catch {
		// Ignore seed reading errors
	}
	return [];
}

export async function listTopics(): Promise<Topic[]> {
	try {
		const rows = (await db.select().from(topics)) as unknown as TopicRow[];
		if (rows.length === 0) {
			const seeds = getSeedTopics();
			if (seeds.length > 0) return seeds;
		}
		return rows
			.map(toTopic)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	} catch (err) {
		logger.warn({ err }, "Database query failed, returning seed topics");
		return getSeedTopics();
	}
}

export async function getTopic(id: string): Promise<Topic | null> {
	try {
		const [row] = await db
			.select()
			.from(topics)
			.where(eq(topics.id, id))
			.limit(1);
		if (row) return toTopic(row as unknown as TopicRow);
	} catch (err) {
		logger.warn({ err, id }, "Database query failed for getTopic");
	}
	const seeds = getSeedTopics();
	return seeds.find((t) => t.id === id) ?? null;
}

export async function createTopic(topic: Topic): Promise<Topic> {
	try {
		const row = {
			...fromTopic(topic),
			createdAt: topic.createdAt,
			updatedAt: topic.updatedAt,
		};
		await db.insert(topics).values(row);
	} catch (err) {
		logger.error({ err }, "Failed to insert topic into DB");
	}
	return topic;
}

export async function updateTopic(id: string, topic: Topic): Promise<Topic> {
	try {
		const row = {
			...fromTopic(topic),
			createdAt: topic.createdAt,
			updatedAt: topic.updatedAt,
		};
		await db.update(topics).set(row).where(eq(topics.id, id));
	} catch (err) {
		logger.error({ err }, "Failed to update topic in DB");
	}
	return topic;
}

export async function deleteTopic(id: string): Promise<boolean> {
	try {
		const result = await db.delete(topics).where(eq(topics.id, id));
		return (result.rowsAffected ?? 1) > 0;
	} catch (err) {
		logger.error({ err }, "Failed to delete topic from DB");
		return false;
	}
}

export async function replaceAllTopics(items: Topic[]): Promise<void> {
	try {
		await db.delete(topics);
		for (const topic of items) {
			const row = {
				...fromTopic(topic),
				createdAt: topic.createdAt,
				updatedAt: topic.updatedAt,
			};
			await db.insert(topics).values(row);
		}
	} catch (err) {
		logger.error({ err }, "Failed to replace topics in DB");
	}
}

export async function seedIfEmpty(): Promise<void> {
	try {
		const count = await db.select({ id: topics.id }).from(topics);
		if (count.length > 0) return;

		const seed = getSeedTopics();
		if (seed.length === 0) return;

		await replaceAllTopics(seed);
		logger.info({ count: seed.length }, "Seeded database with default topics");
	} catch (error) {
		logger.warn({ err: String(error) }, "Database seeding skipped or deferred");
	}
}
