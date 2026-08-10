import { describe, expect, it } from "vitest";
import type { Topic } from "../types/topic.types";
import { validateTopic, wordCount } from "./validator";

const makeTopic = (overrides: Partial<Topic> = {}): Topic => ({
	id: "test-1",
	title: "Judicial Review",
	category: "Polity",
	meaning:
		"Judicial review is the power of courts to examine the constitutionality of legislative and executive actions under the Indian Constitution. It is a basic feature of the constitutional framework.",
	quote: { text: "The Constitution is the supreme law.", source: "Author" },
	pros: [
		{
			title: "P1",
			explanation: "Short explanation one",
			example: "Example one here",
		},
		{
			title: "P2",
			explanation: "Short explanation two",
			example: "Example two here",
		},
		{
			title: "P3",
			explanation: "Short explanation three",
			example: "Example three here",
		},
		{
			title: "P4",
			explanation: "Short explanation four",
			example: "Example four here",
		},
	],
	cons: [
		{ title: "C1", explanation: "Short con one", example: "Example con one" },
		{ title: "C2", explanation: "Short con two", example: "Example con two" },
		{
			title: "C3",
			explanation: "Short con three",
			example: "Example con three",
		},
		{ title: "C4", explanation: "Short con four", example: "Example con four" },
	],
	wayForward:
		"The government should implement the National Litigation Policy and establish specialized benches for constitutional matters. Alternative dispute resolution mechanisms must be promoted to reduce pendency. Legal aid should be expanded through the National Legal Services Authority to improve access to justice for marginalized citizens. This requires adequate funding and timely appointments of judges at all levels.",
	conclusion: {
		negative:
			"Judicial overreach and enormous case pendency remain persistent structural challenges.",
		positive:
			"However, judicial review remains the bedrock of the Indian constitutional democracy.",
	},
	source: "local",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe("wordCount", () => {
	it("counts whitespace-separated words", () => {
		expect(wordCount("hello world")).toBe(2);
		expect(wordCount("  spaced   out   text ")).toBe(3);
		expect(wordCount("   ")).toBe(0);
		expect(wordCount("")).toBe(0);
	});
});

describe("validateTopic", () => {
	it("returns isValid true for a well-formed topic", () => {
		const report = validateTopic(makeTopic());
		expect(report.isValid).toBe(true);
		expect(report.score).toBe(100);
		expect(report.warnings).toEqual([]);
	});

	it("flags wrong number of pros and cons", () => {
		const base = makeTopic();
		const report = validateTopic(
			makeTopic({ pros: base.pros.slice(0, 2), cons: base.cons.slice(0, 2) }),
		);

		expect(report.score).toBe(70);
		expect(report.warnings.some((w) => w.includes("2 pros found"))).toBe(true);
		expect(report.warnings.some((w) => w.includes("2 cons found"))).toBe(true);
		expect(report.isValid).toBe(false);
	});

	it("flags over-long explanations and examples", () => {
		const long = "word ".repeat(30).trim();
		const report = validateTopic(
			makeTopic({
				pros: [{ title: "P1", explanation: long, example: "short" }],
			}),
		);

		expect(
			report.warnings.some((w) => w.includes("explanation has 30 words")),
		).toBe(true);
		expect(report.score).toBeLessThan(100);
	});

	it("flags over-long quote", () => {
		const report = validateTopic(
			makeTopic({ quote: { text: "word ".repeat(21).trim(), source: "x" } }),
		);

		expect(report.warnings.some((w) => w.includes("max 20"))).toBe(true);
	});

	it("flags a single-line string conclusion", () => {
		const report = validateTopic(
			makeTopic({ conclusion: "just one line here" }),
		);

		expect(
			report.warnings.some((w) => w.includes("1 lines (expected 2)")),
		).toBe(true);
		expect(report.score).toBe(90);
	});

	it("never returns a negative score", () => {
		const report = validateTopic(
			makeTopic({
				meaning: "hi",
				quote: { text: "hi", source: "x" },
				pros: [],
				cons: [],
				wayForward: "short",
				conclusion: "just one",
			}),
		);

		expect(report.score).toBe(40);
		expect(report.score).toBeGreaterThanOrEqual(0);
	});
});
