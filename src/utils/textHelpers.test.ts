import { describe, expect, it } from "vitest";
import type { Topic } from "../types/topic.types";
import { cleanText, formatFullTopicPlainText } from "./textHelpers";

describe("textHelpers", () => {
	it("cleanText removes non-breaking hyphens, special dashes, and curly quotes", () => {
		const raw =
			"AI\u2011driven gig\u2011based “innovation” & ‘smart’ policy\u2014reforms";
		const cleaned = cleanText(raw);
		expect(cleaned).toBe(
			"AI-driven gig-based \"innovation\" & 'smart' policy-reforms",
		);
	});

	it("cleanText strips markdown markers (**bold**, *italic*, headers, blockquotes)", () => {
		const markdown =
			"## 1. Heading\n> **Bold text** and *italic* with `inline code`";
		const cleaned = cleanText(markdown);
		expect(cleaned).not.toContain("##");
		expect(cleaned).not.toContain("**");
		expect(cleaned).not.toContain("*");
		expect(cleaned).not.toContain("`");
		expect(cleaned).toContain("Bold text and italic with inline code");
	});

	it("formatFullTopicPlainText produces clean, readable plain text without markdown markers", () => {
		const sampleTopic: Topic = {
			id: "t1",
			title: "Future Business",
			category: "Economy",
			meaning:
				"Commercial models driven by AI\u2011driven tech and sustainability.",
			quote: {
				text: "The best way to predict the future is to create it.",
				source: "Peter Drucker",
			},
			pros: [
				{
					title: "Digital Transformation",
					explanation: "Accelerates operational efficiency.",
					example:
						"Amazon's AI\u2011driven logistics network expanded in 2023.",
				},
			],
			cons: [
				{
					title: "Job Displacement",
					explanation: "Automation replaces routine tasks.",
					example: "Foxconn's integration in 2023.",
				},
			],
			wayForward: [
				"Draft a comprehensive National AI Ethics Framework.",
				"Scale up PMKVY 2.0 modules.",
			],
			conclusion: {
				negative: "Future business is challenged by rapid disruptions.",
				positive: "However, targeted policies transform these challenges.",
			},
			source: "web",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const plainText = formatFullTopicPlainText(sampleTopic);

		// Assert that no markdown artifacts exist
		expect(plainText).not.toContain("##");
		expect(plainText).not.toContain("**");
		expect(plainText).not.toContain("*Case in Point:*");
		expect(plainText).not.toContain("\u2011");

		// Assert structured readable sections exist
		expect(plainText).toContain("FUTURE BUSINESS");
		expect(plainText).toContain("Category: Economy");
		expect(plainText).toContain("1. MEANING & CONTEXT");
		expect(plainText).toContain("2. NOTABLE QUOTE");
		expect(plainText).toContain(
			'"The best way to predict the future is to create it."',
		);
		expect(plainText).toContain("3. KEY ADVANTAGES & ARGUMENTS");
		expect(plainText).toContain("3.1 Digital Transformation");
		expect(plainText).toContain(
			"Example: Amazon's AI-driven logistics network expanded in 2023.",
		);
		expect(plainText).toContain("4. CHALLENGES & CONCERNS");
		expect(plainText).toContain("4.1 Job Displacement");
		expect(plainText).toContain("5. WAY FORWARD & POLICY REFORMS");
		expect(plainText).toContain(
			"1. Draft a comprehensive National AI Ethics Framework.",
		);
		expect(plainText).toContain("6. BALANCED MAINS CONCLUSION");
	});
});
