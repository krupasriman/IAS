import { z } from "zod";
import { CategorySchema } from "../../src/utils/topicSchema";

export const ProConItemSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(3),
	explanation: z.string().min(10),
	example: z.string().min(3),
});

export const EvalTopicSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(3),
	category: CategorySchema,
	meaning: z.string().min(20),
	quote: z.object({
		text: z.string().min(10),
		source: z.string().min(2),
	}),
	pros: z.array(ProConItemSchema).min(3).max(6),
	cons: z.array(ProConItemSchema).min(3).max(6),
	wayForward: z.array(z.string().min(10)).min(2).max(6),
	conclusion: z.union([
		z.object({
			negative: z.string().min(15),
			positive: z.string().min(15),
		}),
		z.string().min(30),
	]),
	source: z.enum(["local", "web"]),
	tags: z.array(z.string()).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export interface EvalBenchmarkCase {
	id: string;
	title: string;
	category: string;
	context: string;
}

export const BENCHMARK_TOPICS: EvalBenchmarkCase[] = [
	{
		id: "ucc-eval",
		title: "Uniform Civil Code: Constitutional Dimensions and Federal Concerns",
		category: "Polity",
		context:
			"Article 44 of the Directive Principles envisions UCC. Law Commission consultation papers have highlighted pluralism and personal laws across states like Goa and Uttarakhand.",
	},
	{
		id: "cbdc-eval",
		title: "Central Bank Digital Currency (CBDC) in India",
		category: "Economy",
		context:
			"RBI launched pilot wholesale and retail e-Rupee in 2022 to reduce cash logistics costs and improve cross-border payments while monitoring privacy protections.",
	},
	{
		id: "cbam-eval",
		title: "EU Carbon Border Adjustment Mechanism (CBAM) and Indian Industry",
		category: "Environment",
		context:
			"CBAM imposes carbon tariffs on imported steel, aluminum, and fertilizers into the EU from 2026, posing compliance challenges for Indian MSME exporters.",
	},
	{
		id: "act-east-eval",
		title: "India's Act East Policy and ASEAN Centrality",
		category: "IR",
		context:
			"Commerce, connectivity, and culture form the triad of Act East, focusing on Indo-Pacific maritime security, Kaladan Multi-Modal project, and Trilateral Highway.",
	},
	{
		id: "ai-ethics-eval",
		title: "Artificial Intelligence in Public Administration",
		category: "Governance",
		context:
			"Automated welfare delivery and predictive policing using AI introduce questions of algorithmic transparency, citizen data privacy, and unaccountable automated rejections.",
	},
];

export interface EvalScoreResult {
	topicId: string;
	schemaValid: boolean;
	prosConsBalanceScore: number; // 0 - 30
	conclusionPivotScore: number; // 0 - 30
	groundingScore: number; // 0 - 40
	totalScore: number; // 0 - 100
	passed: boolean;
	details: string[];
}

export function evaluateTopic(
	topic: unknown,
	benchmark: EvalBenchmarkCase,
): EvalScoreResult {
	const details: string[] = [];
	let prosConsBalanceScore = 0;
	let conclusionPivotScore = 0;
	let groundingScore = 0;

	// 1. Schema Validation (Hard gate)
	const parsed = EvalTopicSchema.safeParse(topic);
	const schemaValid = parsed.success;
	if (!schemaValid) {
		details.push(
			`Schema validation failed: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
		);
	} else {
		details.push("Schema conformance: 100% valid UPSC Topic format");
	}

	const data = parsed.success
		? parsed.data
		: (topic as Record<string, unknown>);

	// 2. Pros/Cons Rubric Balance (30 pts)
	const prosCount = Array.isArray(data?.pros) ? data.pros.length : 0;
	const consCount = Array.isArray(data?.cons) ? data.cons.length : 0;
	if (prosCount >= 4 && consCount >= 4) {
		prosConsBalanceScore += 20;
		details.push(
			`Balanced dimensional coverage: ${prosCount} Pros, ${consCount} Cons`,
		);
	} else if (prosCount >= 3 && consCount >= 3) {
		prosConsBalanceScore += 12;
		details.push(
			`Marginal dimensional coverage: ${prosCount} Pros, ${consCount} Cons`,
		);
	} else {
		details.push(`Deficient coverage: ${prosCount} Pros, ${consCount} Cons`);
	}

	// Examples verification inside pros & cons
	const allItems = [
		...(Array.isArray(data?.pros) ? data.pros : []),
		...(Array.isArray(data?.cons) ? data.cons : []),
	];
	const hasExamples = allItems.every(
		(item: { example?: unknown }) =>
			typeof item?.example === "string" && item.example.length > 5,
	);
	if (hasExamples && allItems.length > 0) {
		prosConsBalanceScore += 10;
		details.push(
			"All arguments backed by concrete case studies / constitutional examples",
		);
	}

	// 3. Conclusion Pivot (30 pts)
	if (typeof data?.conclusion === "object" && data?.conclusion !== null) {
		const negLen = (data.conclusion.negative || "").length;
		const posLen = (data.conclusion.positive || "").length;
		if (negLen > 20 && posLen > 20) {
			conclusionPivotScore = 30;
			details.push(
				"Exemplary two-tier conclusion: negative risk matched with proactive positive resolution",
			);
		} else {
			conclusionPivotScore = 15;
			details.push("Incomplete two-tier conclusion structure");
		}
	} else if (
		typeof data?.conclusion === "string" &&
		data.conclusion.length > 40
	) {
		conclusionPivotScore = 20;
		details.push("Single-block conclusion provided");
	}

	// 4. Grounding in Context (40 pts)
	const contextTokens = benchmark.context
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter((word) => word.length > 4);

	const topicText = JSON.stringify(data).toLowerCase();
	let overlapCount = 0;
	for (const token of contextTokens) {
		if (topicText.includes(token)) {
			overlapCount++;
		}
	}

	const overlapRatio =
		contextTokens.length > 0 ? overlapCount / contextTokens.length : 1;
	groundingScore = Math.min(40, Math.round(overlapRatio * 50));
	details.push(
		`Context grounding: ${overlapCount}/${contextTokens.length} key terms present (${groundingScore}/40 pts)`,
	);

	const totalScore = schemaValid
		? prosConsBalanceScore + conclusionPivotScore + groundingScore
		: 0;

	return {
		topicId: benchmark.id,
		schemaValid,
		prosConsBalanceScore,
		conclusionPivotScore,
		groundingScore,
		totalScore,
		passed: schemaValid && totalScore >= 70,
		details,
	};
}

if (process.argv[1]?.includes("evalHarness")) {
	console.log("Running UPSC Model Evaluation Benchmark Harness...\n");
	console.log(`Loaded ${BENCHMARK_TOPICS.length} benchmark evaluation cases.`);
	console.log("Evaluation rubric gates: Schema Valid + Min Score 70/100.\n");
}
