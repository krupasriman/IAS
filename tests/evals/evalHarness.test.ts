import { describe, expect, it } from "vitest";
import { BENCHMARK_TOPICS, evaluateTopic } from "./evalHarness";

describe("UPSC Model Evaluation Harness", () => {
	it("should load benchmark topics", () => {
		expect(BENCHMARK_TOPICS.length).toBe(5);
		for (const topic of BENCHMARK_TOPICS) {
			expect(topic.title).toBeTruthy();
			expect(topic.context).toBeTruthy();
		}
	});

	it("should grade compliant UPSC notes with high rubric score", () => {
		const benchmark = BENCHMARK_TOPICS[0]; // UCC
		const sampleNote = {
			id: "ucc-eval",
			title:
				"Uniform Civil Code: Constitutional Dimensions and Federal Concerns",
			category: "Polity",
			meaning:
				"A common set of governing civil laws for all citizens regardless of religious community, anchored in Article 44.",
			quote: {
				text: "A uniform civil code will help national integration by removing disparate loyalties.",
				source: "Dr. B.R. Ambedkar",
			},
			pros: [
				{
					title: "Constitutional Mandate",
					explanation:
						"Fulfills Directive Principles under Article 44 to promote national integration.",
					example:
						"Supreme Court judgment in Shah Bano (1985) urging legislative enactment.",
				},
				{
					title: "Gender Justice",
					explanation:
						"Eliminates discriminatory practices embedded within personal laws concerning inheritance and maintenance.",
					example: "Abolition of Triple Talaq in Shayara Bano case (2017).",
				},
				{
					title: "Simplification of Legal System",
					explanation:
						"Replaces fragmented customary laws with a cohesive civil jurisprudence across all states.",
					example:
						"Goa Civil Code serving as a precedent for uniform civil administration.",
				},
				{
					title: "Secular Principle",
					explanation:
						"Separates civil contracts and legal obligations from religious orthodoxy in public administration.",
					example:
						"Special Marriage Act 1954 framework for interfaith marriages.",
				},
			],
			cons: [
				{
					title: "Threat to Pluralism",
					explanation:
						"Risks undermining diverse tribal traditions and religious protections guaranteed under Article 25.",
					example:
						"Tribal autonomy protections under Sixth Schedule in Northeastern states.",
				},
				{
					title: "Federal Friction",
					explanation:
						"Unilateral central codification conflicts with state-level legislative traditions in family matters.",
					example:
						"Law Commission 21st Consultation paper advising against compulsory uniformity.",
				},
				{
					title: "Social Friction",
					explanation:
						"Could alienate minority communities without prior consultative consensus building.",
					example:
						"Resistance from community religious boards fearing assimilation.",
				},
				{
					title: "Implementation Hurdles",
					explanation:
						"Extensive differences in customary practices and local statutes require complicated transitional exemptions.",
					example:
						"Uttarakhand UCC formulation requiring separate state exemption panels.",
				},
			],
			wayForward: [
				"Adopt piecemeal reform addressing gender discrimination in succession and marriage first.",
				"Engage in wide stakeholder consultations respecting tribal customs.",
				"Standardize registration procedures while protecting voluntary civil remedies.",
			],
			conclusion: {
				negative:
					"Imposing a rigid, top-down uniform code without consensus risks alienating diverse communities and stoking communal friction.",
				positive:
					"A phased, consultative approach harmonizing gender equity with cultural diversity will fulfill constitutional ideals while preserving federal pluralism.",
			},
			source: "web",
			tags: ["Constitution", "Article 44", "Federalism"],
			createdAt: "2026-09-22T08:00:00.000Z",
			updatedAt: "2026-09-22T08:00:00.000Z",
		};

		const result = evaluateTopic(sampleNote, benchmark);
		expect(result.schemaValid).toBe(true);
		expect(result.passed).toBe(true);
		expect(result.totalScore).toBeGreaterThanOrEqual(80);
	});

	it("should reject non-compliant malformed notes", () => {
		const benchmark = BENCHMARK_TOPICS[1];
		const invalidNote = {
			title: "Just a Title",
			category: "Economy",
		};

		const result = evaluateTopic(invalidNote, benchmark);
		expect(result.schemaValid).toBe(false);
		expect(result.passed).toBe(false);
		expect(result.totalScore).toBe(0);
	});
});
