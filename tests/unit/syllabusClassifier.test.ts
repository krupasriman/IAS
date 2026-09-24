import { describe, expect, it } from "vitest";
import {
	classifySyllabusRelevance,
	clearSyllabusClassifierCache,
} from "../../server/services/guardrail/syllabusClassifier";

describe("SyllabusClassifier Service", () => {
	it("accepts recognized UPSC topics in test environment", async () => {
		const result = await classifySyllabusRelevance(
			"Uniform Civil Code and Secularism",
			"groq",
			"gsk_dummy_key",
		);

		expect(result.isValid).toBe(true);
		expect(result.gsPaper).toBe("GS2");
	});

	it("identifies and rejects disguised fiction/pop-culture queries", async () => {
		const result = await classifySyllabusRelevance(
			"Governance and International Relations in Hogwarts",
			"groq",
			"gsk_dummy_key",
		);

		expect(result.isValid).toBe(false);
		expect(result.reason).toMatch(/fiction|entertainment|outside/i);
	});

	it("caches classification results for repeat queries", async () => {
		clearSyllabusClassifierCache();

		const first = await classifySyllabusRelevance(
			"Monetary Policy Committee",
			"groq",
			"gsk_dummy_key",
		);
		expect(first.cached).toBeUndefined();

		const second = await classifySyllabusRelevance(
			"Monetary Policy Committee",
			"groq",
			"gsk_dummy_key",
		);
		expect(second.cached).toBe(true);
		expect(second.isValid).toBe(true);
	});
});
