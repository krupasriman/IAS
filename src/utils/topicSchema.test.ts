import { describe, expect, it } from "vitest";
import { StructuredTopicSchema } from "./topicSchema";

const validTopic = {
	title: "Judicial Review",
	category: "Polity",
	meaning:
		"Judicial review is the power of courts to examine the constitutionality of legislative and executive actions under the Indian Constitution.",
	quote: {
		text: "The Constitution is the supreme law.",
		source: "B.R. Ambedkar",
	},
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
	wayForward: [
		"The government should implement the National Litigation Policy and establish specialized benches.",
		"Alternative dispute resolution mechanisms must be promoted to reduce pendency.",
		"Legal aid should be expanded through the National Legal Services Authority to improve access to justice.",
	],
	conclusion: {
		negative: "Judicial overreach remains a challenge.",
		positive: "However, judicial review is a bedrock.",
	},
};

describe("StructuredTopicSchema", () => {
	it("accepts a well-formed topic", () => {
		const result = StructuredTopicSchema.safeParse(validTopic);
		expect(result.success).toBe(true);
	});

	it("rejects fewer than 4 pros", () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			pros: validTopic.pros.slice(0, 3),
		});
		expect(result.success).toBe(false);
	});

	it("rejects fewer than 4 cons", () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			cons: validTopic.cons.slice(0, 2),
		});
		expect(result.success).toBe(false);
	});

	it("rejects a string conclusion instead of an object", () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			conclusion: "just one line here",
		});
		expect(result.success).toBe(false);
	});

	it("rejects a conclusion missing the positive key", () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			conclusion: { negative: "Negative line only" },
		});
		expect(result.success).toBe(false);
	});

	it("rejects an unknown category", () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			category: "Astrology",
		});
		expect(result.success).toBe(false);
	});

	it('normalizes "Science and Technology" to "Science & Tech"', () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			category: "Science and Technology",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.category).toBe("Science & Tech");
	});

	it('normalizes "International Relations" to "IR"', () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			category: "International Relations",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.category).toBe("IR");
	});

	it('normalizes "economics" (lowercase) to "Economy"', () => {
		const result = StructuredTopicSchema.safeParse({
			...validTopic,
			category: "economics",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.category).toBe("Economy");
	});

	it("rejects missing example on a pro item", () => {
		const pros = validTopic.pros.map((p, i) =>
			i === 0 ? { title: p.title, explanation: p.explanation } : p,
		);
		const result = StructuredTopicSchema.safeParse({ ...validTopic, pros });
		expect(result.success).toBe(false);
	});
});
