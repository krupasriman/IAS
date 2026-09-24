import { describe, expect, it } from "vitest";
import { getSeedTopics, listTopicsPaginated } from "./topics";

describe("topics service pagination", () => {
	it("should load seed topics successfully", () => {
		const seeds = getSeedTopics();
		expect(Array.isArray(seeds)).toBe(true);
		expect(seeds.length).toBeGreaterThan(0);
		expect(seeds[0]).toHaveProperty("id");
		expect(seeds[0]).toHaveProperty("title");
		expect(seeds[0]).toHaveProperty("category");
	});

	it("should paginate topics with limit and hasMore flag", async () => {
		const res = await listTopicsPaginated("test-user-pagination", {
			limit: 2,
		});

		expect(res).toHaveProperty("items");
		expect(res).toHaveProperty("totalCount");
		expect(res.items.length).toBeLessThanOrEqual(2);
		expect(typeof res.hasMore).toBe("boolean");
		if (res.hasMore) {
			expect(typeof res.nextCursor).toBe("string");
		}
	});

	it("should filter paginated topics by category", async () => {
		const res = await listTopicsPaginated("test-user-pagination", {
			category: "Polity",
			limit: 10,
		});

		for (const item of res.items) {
			expect(item.category).toBe("Polity");
		}
	});

	it("should handle cursor-based page slicing", async () => {
		const page1 = await listTopicsPaginated("test-user-pagination", {
			limit: 2,
		});

		if (page1.hasMore && page1.nextCursor) {
			const page2 = await listTopicsPaginated("test-user-pagination", {
				cursor: page1.nextCursor,
				limit: 2,
			});

			expect(page2.items).toBeDefined();
			// Page 2 items should not overlap with Page 1 items
			if (page2.items.length > 0) {
				const page1Ids = new Set(page1.items.map((t) => t.id));
				expect(page1Ids.has(page2.items[0].id)).toBe(false);
			}
		}
	});
});
