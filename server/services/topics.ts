import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import type { Topic } from "../../src/types/topic.types";
import { logger } from "../../src/utils/logger";
import { db } from "../db/index";
import { topics } from "../db/schema";

let customRequire: NodeRequire | undefined;
try {
	if (typeof import.meta !== "undefined" && import.meta?.url) {
		customRequire = createRequire(import.meta.url);
	}
} catch {
	// Ignore
}

interface TopicRow {
	id: string;
	userId: string;
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

function fromTopic(
	topic: Topic,
	userId: string,
): Omit<TopicRow, "createdAt" | "updatedAt"> {
	return {
		id: topic.id,
		userId,
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

export function getSeedTopics(): Topic[] {
	try {
		let moduleDir = process.cwd();
		try {
			if (typeof import.meta !== "undefined" && import.meta?.url) {
				moduleDir = path.dirname(fileURLToPath(import.meta.url));
			} else if (typeof __dirname !== "undefined") {
				moduleDir = __dirname;
			}
		} catch {
			// Ignore
		}
		const possiblePaths = [
			path.resolve(moduleDir, "../../public/data/topics.json"),
			path.resolve(moduleDir, "../../dist/data/topics.json"),
			path.resolve(process.cwd(), "public/data/topics.json"),
			path.resolve(process.cwd(), "dist/data/topics.json"),
		];
		for (const seedPath of possiblePaths) {
			if (fs.existsSync(seedPath)) {
				const content = fs.readFileSync(seedPath, "utf8");
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed as Topic[];
				}
			}
		}
	} catch {
		// Ignore seed reading errors
	}
	try {
		if (customRequire) {
			const required = customRequire("../../public/data/topics.json");
			if (Array.isArray(required) && required.length > 0) {
				return required as Topic[];
			}
		}
	} catch {
		// Ignore require fallback error
	}
	return [];
}

export interface PaginatedTopicsOptions {
	cursor?: string;
	limit?: number;
	category?: string;
	search?: string;
}

export interface PaginatedTopicsResponse {
	items: Topic[];
	nextCursor: string | null;
	hasMore: boolean;
	totalCount: number;
}

export async function listTopicsPaginated(
	userId: string,
	opts: PaginatedTopicsOptions = {},
): Promise<PaginatedTopicsResponse> {
	const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
	const { cursor, category, search } = opts;

	try {
		const baseConditions = [eq(topics.userId, userId)];

		if (category && category !== "All") {
			baseConditions.push(eq(topics.category, category));
		}

		if (search?.trim()) {
			const term = `%${search.trim()}%`;
			const searchFilter = or(
				ilike(topics.title, term),
				ilike(topics.meaning, term),
			);
			if (searchFilter) {
				baseConditions.push(searchFilter);
			}
		}

		// Count total matching items
		const [countRow] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(topics)
			.where(and(...baseConditions));
		let totalCount = countRow?.count ?? 0;

		// Seed if table has 0 topics for this user on initial load
		if (totalCount === 0 && !cursor && !search) {
			const seeds = getSeedTopics();
			if (seeds.length > 0) {
				await replaceAllTopics(seeds, userId);
				totalCount = seeds.length;
			}
		}

		const queryConditions = [...baseConditions];

		if (cursor) {
			if (cursor.includes("|")) {
				const [cursorUpdatedAt, cursorId] = cursor.split("|");
				const cursorFilter = or(
					lt(topics.updatedAt, cursorUpdatedAt),
					and(eq(topics.updatedAt, cursorUpdatedAt), lt(topics.id, cursorId)),
				);
				if (cursorFilter) {
					queryConditions.push(cursorFilter);
				}
			} else {
				queryConditions.push(lt(topics.updatedAt, cursor));
			}
		}

		const rows = (await db
			.select()
			.from(topics)
			.where(and(...queryConditions))
			.orderBy(desc(topics.updatedAt), desc(topics.id))
			.limit(limit + 1)) as unknown as TopicRow[];

		const hasMore = rows.length > limit;
		const slicedRows = hasMore ? rows.slice(0, limit) : rows;
		const items = slicedRows.map(toTopic);

		let nextCursor: string | null = null;
		if (hasMore && items.length > 0) {
			const last = items[items.length - 1];
			nextCursor = `${last.updatedAt}|${last.id}`;
		}

		return {
			items,
			nextCursor,
			hasMore,
			totalCount,
		};
	} catch (err) {
		logger.warn(
			{ err: err instanceof Error ? err.message : String(err), userId },
			"Database query failed for listTopicsPaginated; using seed fallback",
		);
		let all = getSeedTopics().sort((a, b) => {
			const timeCmp = b.updatedAt.localeCompare(a.updatedAt);
			if (timeCmp !== 0) return timeCmp;
			return b.id.localeCompare(a.id);
		});
		if (category && category !== "All") {
			all = all.filter((t) => t.category === category);
		}
		if (search?.trim()) {
			const q = search.trim().toLowerCase();
			all = all.filter(
				(t) =>
					t.title.toLowerCase().includes(q) ||
					t.meaning.toLowerCase().includes(q),
			);
		}
		const totalCount = all.length;
		let startIndex = 0;
		if (cursor) {
			let cursorUpdatedAt = cursor;
			let cursorId = "";
			if (cursor.includes("|")) {
				[cursorUpdatedAt, cursorId] = cursor.split("|");
			}
			const idx = all.findIndex((t) => {
				if (cursorId && t.id === cursorId) return true;
				return t.updatedAt < cursorUpdatedAt;
			});
			if (idx >= 0) {
				startIndex = cursorId ? idx + 1 : idx;
			}
		}
		const sliced = all.slice(startIndex, startIndex + limit);
		const hasMore = startIndex + limit < totalCount;
		const nextCursor =
			hasMore && sliced.length > 0
				? `${sliced[sliced.length - 1].updatedAt}|${sliced[sliced.length - 1].id}`
				: null;

		return {
			items: sliced,
			nextCursor,
			hasMore,
			totalCount,
		};
	}
}

export async function listTopics(userId: string): Promise<Topic[]> {
	try {
		const rows = (await db
			.select()
			.from(topics)
			.where(eq(topics.userId, userId))) as unknown as TopicRow[];

		if (rows.length === 0) {
			const seeds = getSeedTopics();
			if (seeds.length > 0) {
				// Lazily seed for this user
				await replaceAllTopics(seeds, userId);
				return seeds;
			}
		}

		return rows
			.map(toTopic)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	} catch (err) {
		logger.warn({ err, userId }, "Database query failed for listTopics");
		return getSeedTopics();
	}
}

export async function getTopic(
	id: string,
	userId: string,
): Promise<Topic | null> {
	try {
		const [row] = await db
			.select()
			.from(topics)
			.where(and(eq(topics.id, id), eq(topics.userId, userId)))
			.limit(1);

		if (row) return toTopic(row as unknown as TopicRow);
	} catch (err) {
		logger.warn({ err, id, userId }, "Database query failed for getTopic");
	}
	const seeds = getSeedTopics();
	return seeds.find((t) => t.id === id) ?? null;
}

export async function createTopic(
	topic: Topic,
	userId: string,
): Promise<Topic> {
	const row = {
		...fromTopic(topic, userId),
		createdAt: topic.createdAt,
		updatedAt: topic.updatedAt,
	};
	await db.insert(topics).values(row);
	return topic;
}

export async function updateTopic(
	id: string,
	topic: Topic,
	userId: string,
): Promise<Topic> {
	const row = {
		...fromTopic(topic, userId),
		createdAt: topic.createdAt,
		updatedAt: topic.updatedAt,
	};
	await db
		.update(topics)
		.set(row)
		.where(and(eq(topics.id, id), eq(topics.userId, userId)));
	return topic;
}

export async function deleteTopic(
	id: string,
	userId: string,
): Promise<boolean> {
	try {
		const result = await db
			.delete(topics)
			.where(and(eq(topics.id, id), eq(topics.userId, userId)));
		return (result.rowCount ?? 0) > 0;
	} catch (err) {
		logger.error({ err, id, userId }, "Failed to delete topic from DB");
		return false;
	}
}

export async function replaceAllTopics(
	items: Topic[],
	userId: string,
): Promise<void> {
	if (items.length === 0) return;
	try {
		await db.transaction(async (tx) => {
			await tx.delete(topics).where(eq(topics.userId, userId));
			const rows = items.map((topic) => ({
				...fromTopic(topic, userId),
				createdAt: topic.createdAt,
				updatedAt: topic.updatedAt,
			}));
			await tx.insert(topics).values(rows);
		});
	} catch (err) {
		logger.error({ err, userId }, "Failed to atomic replace topics in DB");
		throw err;
	}
}

export async function seedIfEmpty(
	userId = "usr_local_admin_0000000000",
): Promise<void> {
	try {
		const existing = await db
			.select({ id: topics.id })
			.from(topics)
			.where(eq(topics.userId, userId))
			.limit(1);

		if (existing.length > 0) return;

		const seeds = getSeedTopics();
		if (seeds.length === 0) return;

		await replaceAllTopics(seeds, userId);
		logger.info(
			{ userId, count: seeds.length },
			"Seeded user database with initial topics",
		);
	} catch (error) {
		logger.warn(
			{ err: String(error) },
			"Database seeding deferred (Postgres may not be connected yet)",
		);
	}
}
