import { describe, expect, it } from "vitest";
import type { Topic } from "../../../src/types/topic.types";
import {
	generateTopicCacheKey,
	getCachedTopic,
	setCachedTopic,
} from "./llmCache";

describe("llmCache", () => {
	it("generates deterministic cache keys invariant of case or whitespace", () => {
		const k1 = generateTopicCacheKey("  Judicial Review  ", "Polity");
		const k2 = generateTopicCacheKey("judicial review", "polity");
		const k3 = generateTopicCacheKey("Judicial Review", "Economy");

		expect(k1).toBe(k2);
		expect(k1).not.toBe(k3);
		expect(k1.startsWith("llm:topic:")).toBe(true);
	});

	it("stores and retrieves cached topics with high fidelity", async () => {
		const key = generateTopicCacheKey("Test Topic", "Polity");
		const fakeTopic: Topic = {
			id: "test-id",
			title: "Test Topic",
			category: "Polity",
			meaning: "Definition of concept",
			quote: { text: "Quote", source: "Thinker" },
			pros: [{ title: "P1", explanation: "E1", example: "Ex1" }],
			cons: [{ title: "C1", explanation: "E1", example: "Ex1" }],
			wayForward: ["Step 1"],
			conclusion: { negative: "Neg", positive: "Pos" },
			source: "web",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await setCachedTopic(key, fakeTopic, 60);
		const cached = await getCachedTopic(key);

		expect(cached).toEqual(fakeTopic);
	});
});
