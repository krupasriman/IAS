import { describe, expect, it } from "vitest";
import { extractTopicPayload } from "./topicParser";

const sampleValidTopic = {
	title: "Uniform Civil Code",
	category: "Polity",
	meaning:
		"A Uniform Civil Code refers to a common set of laws governing personal matters for all citizens regardless of religion.",
	quote: {
		text: "Secularism is part of the basic structure of the Constitution.",
		source: "S.R. Bommai Case (1994)",
	},
	pros: [
		{
			title: "Gender Justice",
			explanation: "Eliminates discriminatory personal laws against women.",
			example: "Triple Talaq judgment (Shayara Bano case).",
		},
		{
			title: "National Integration",
			explanation:
				"Fosters shared civic identity under a single civil law framework.",
			example: "Goa Civil Code operational experience.",
		},
		{
			title: "Constitutional Mandate",
			explanation: "Fulfills Directive Principle under Article 44.",
			example: "Law Commission of India consultation papers.",
		},
		{
			title: "Administrative Simplicity",
			explanation: "Simplifies judicial adjudication of civil disputes.",
			example: "Special Marriage Act 1954 procedures.",
		},
	],
	cons: [
		{
			title: "Plurality Concerns",
			explanation: "May infringe on religious freedom and cultural diversity.",
			example: "Article 25 and 26 protections in tribal communities.",
		},
		{
			title: "Minority Apprehensions",
			explanation:
				"Creates anxieties regarding imposition of majoritarian norms.",
			example: "Representations from diverse religious boards.",
		},
		{
			title: "Tribal Custom Exemptions",
			explanation:
				"Sixth Schedule and Article 371 protections complicate uniformity.",
			example: "Customary land and marriage laws in Nagaland.",
		},
		{
			title: "Political Consensus Deficit",
			explanation:
				"Requires deep consultative deliberation across civil society.",
			example: "21st Law Commission recommendations on codification.",
		},
	],
	wayForward: [
		"Codify and reform personal laws incrementally with community consultation.",
		"Protect tribal customary rights under Sixth Schedule safeguards.",
		"Promote gender-equal provisions across existing statutes.",
	],
	conclusion: {
		negative:
			"Enforcing uniformity without consensus risks social friction across diverse communities.",
		positive:
			"However, phased reforms prioritizing gender equity will advance constitutional justice.",
	},
};

describe("extractTopicPayload", () => {
	it("parses clean JSON directly", () => {
		const result = extractTopicPayload(
			JSON.stringify(sampleValidTopic),
			"Uniform Civil Code",
			"Polity",
		);
		expect(result.title).toBe("Uniform Civil Code");
		expect(result.category).toBe("Polity");
		expect(result.pros.length).toBe(4);
	});

	it("extracts JSON from markdown code fences", () => {
		const raw = `Here is your structured study note:\n\`\`\`json\n${JSON.stringify(
			sampleValidTopic,
		)}\n\`\`\`\nHope this helps!`;
		const result = extractTopicPayload(raw, "Uniform Civil Code", "Polity");
		expect(result.title).toBe("Uniform Civil Code");
	});

	it("extracts JSON from unclosed markdown code fences", () => {
		const raw = `\`\`\`json\n${JSON.stringify(sampleValidTopic)}`;
		const result = extractTopicPayload(raw, "Uniform Civil Code", "Polity");
		expect(result.title).toBe("Uniform Civil Code");
	});

	it("strips <think> reasoning tokens before parsing", () => {
		const raw = `<think>\nLet's analyze Uniform Civil Code in GS2 Polity.\nIt relates to Article 44 {DPSP}.\n</think>\n${JSON.stringify(
			sampleValidTopic,
		)}`;
		const result = extractTopicPayload(raw, "Uniform Civil Code", "Polity");
		expect(result.title).toBe("Uniform Civil Code");
	});

	it("unwraps nested topic container", () => {
		const raw = JSON.stringify({ topic: sampleValidTopic });
		const result = extractTopicPayload(raw, "Uniform Civil Code", "Polity");
		expect(result.title).toBe("Uniform Civil Code");
	});

	it("repairs trailing commas in JSON", () => {
		const trailingCommaJson = JSON.stringify(sampleValidTopic).replace(
			/\]\s*\}\s*$/,
			",]}",
		);
		const result = extractTopicPayload(
			trailingCommaJson,
			"Uniform Civil Code",
			"Polity",
		);
		expect(result.title).toBe("Uniform Civil Code");
	});

	it("falls back to markdown parser when model returns pure markdown", () => {
		const markdown = `
# Meaning
The Uniform Civil Code is a proposal in India to formulate and implement personal laws of citizens which apply on all citizens equally.

# Quote
"Article 44 directs the State to secure for citizens a Uniform Civil Code." - Constitution of India

# Pros
1. Gender Equality: Protects women from discriminatory practices. Example: Triple Talaq abolition.
2. Secularism: Strengthens secular framework. Example: Supreme Court Shah Bano case.

# Cons
1. Cultural Freedom: Conflicts with customary traditions. Example: Northeast tribal practices.
2. Political Sensitivity: Requires broad consensus. Example: Law Commission reports.

# Way Forward
- Undertake wide consultations with all religious communities.
- Focus on gender justice before complete uniformity.
- Protect tribal customs under constitutional safeguards.

# Conclusion
Uniformity should not come at the cost of diversity.
However, progressive reforms will enhance gender equity.
`;
		const result = extractTopicPayload(
			markdown,
			"Uniform Civil Code",
			"Polity",
		);
		expect(result.title).toBe("Uniform Civil Code");
		expect(result.pros.length).toBe(4); // padded to 4
		expect(result.cons.length).toBe(4); // padded to 4
	});

	it("detects model refusal text and throws clean syllabus guidance error", () => {
		const refusalMessage =
			"I cannot generate study notes for 'messi' because it is a sports/entertainment topic and not part of the UPSC General Studies syllabus.";
		expect(() =>
			extractTopicPayload(refusalMessage, "messi", "Polity"),
		).toThrow(/outside the UPSC CSE syllabus/i);
	});

	it("throws human-friendly error on empty or garbage input", () => {
		expect(() => extractTopicPayload("", "Test")).toThrow(
			/The AI model returned an empty response/i,
		);
		expect(() => extractTopicPayload("   \n\t  ", "Test")).toThrow(
			/The AI model returned an empty response/i,
		);
		expect(() => extractTopicPayload("lorem ipsum dolor", "Test")).toThrow(
			/The AI model output could not be parsed/i,
		);
	});
});
