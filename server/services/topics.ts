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

export async function listTopics(): Promise<Topic[]> {
	const rows = db.select().from(topics).all() as unknown as TopicRow[];
	return rows
		.map(toTopic)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTopic(id: string): Promise<Topic | null> {
	const row = db.select().from(topics).where(eq(topics.id, id)).get();
	return row ? toTopic(row as unknown as TopicRow) : null;
}

export async function createTopic(topic: Topic): Promise<Topic> {
	const row = {
		...fromTopic(topic),
		createdAt: topic.createdAt,
		updatedAt: topic.updatedAt,
	};
	db.insert(topics).values(row).run();
	return topic;
}

export async function updateTopic(id: string, topic: Topic): Promise<Topic> {
	const row = {
		...fromTopic(topic),
		createdAt: topic.createdAt,
		updatedAt: topic.updatedAt,
	};
	db.update(topics).set(row).where(eq(topics.id, id)).run();
	return topic;
}

export async function deleteTopic(id: string): Promise<boolean> {
	const result = db.delete(topics).where(eq(topics.id, id)).run();
	return result.changes > 0;
}

export async function replaceAllTopics(items: Topic[]): Promise<void> {
	db.delete(topics).run();
	for (const topic of items) {
		const row = {
			...fromTopic(topic),
			createdAt: topic.createdAt,
			updatedAt: topic.updatedAt,
		};
		db.insert(topics).values(row).run();
	}
}

export async function seedIfEmpty(): Promise<void> {
	const count = db.select({ id: topics.id }).from(topics).all();
	if (count.length > 0) return;

	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const seedPath = path.resolve(__dirname, "../../public/data/topics.json");
	if (!fs.existsSync(seedPath)) return;

	try {
		const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as Topic[];
		await replaceAllTopics(seed);
		logger.info({ count: seed.length }, "Seeded database with default topics");
	} catch (error) {
		logger.error({ err: String(error) }, "Failed to seed database");
	}
}
