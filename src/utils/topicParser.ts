import type { CategoryType, ProConItem, Topic } from "../types/topic.types";
import { parseMarkdownToTopic } from "./parser";
import {
	type StructuredTopic,
	StructuredTopicSchema,
	unwrapTopicPayload,
} from "./topicSchema";

/**
 * Ensures array of ProCon items has exactly 4 items required by UPSC answer framework.
 */
function ensureFourItems(
	items: ProConItem[] | undefined,
	type: "pro" | "con",
	_topicTitle: string,
): ProConItem[] {
	const current = Array.isArray(items) ? [...items] : [];
	const defaults: Record<"pro" | "con", ProConItem[]> = {
		pro: [
			{
				title: "Institutional Stability",
				explanation:
					"Strengthens constitutional governance and standardizes administrative procedures.",
				example:
					"Central Vigilance Commission guidelines and ARC recommendations.",
			},
			{
				title: "Democratic Accountability",
				explanation:
					"Empowers citizens and enhances public transparency across departments.",
				example: "Right to Information Act implementations.",
			},
			{
				title: "Socio-Economic Development",
				explanation:
					"Improves service delivery and targets welfare subsidies effectively.",
				example: "Direct Benefit Transfer schemes in recent budgets.",
			},
			{
				title: "Judicial Harmony",
				explanation:
					"Harmonizes fundamental rights with directive principles of state policy.",
				example: "Landmark Supreme Court constitutional bench rulings.",
			},
		],
		con: [
			{
				title: "Implementation Gaps",
				explanation:
					"Capacity constraints at grassroots administrative levels hinder execution.",
				example: "Gram Panchayat administrative reports.",
			},
			{
				title: "Federal Friction",
				explanation:
					"Divergent state priorities can lead to jurisdictional conflicts.",
				example: "Inter-State Council deliberations.",
			},
			{
				title: "Fiscal Burden",
				explanation:
					"Substantial budgetary outlays required for infrastructure and training.",
				example: "CAG state expenditure audits.",
			},
			{
				title: "Enforcement Delays",
				explanation:
					"Procedural compliance requirements can slow swift administrative decision-making.",
				example: "Departmental project delay assessments.",
			},
		],
	};

	while (current.length < 4) {
		const fallbackItem = defaults[type][current.length] || defaults[type][0];
		current.push(fallbackItem);
	}

	return current.slice(0, 4);
}

/**
 * Extracts, repairs, and parses a StructuredTopic from raw LLM output.
 * Handles markdown code blocks, reasoning traces (<think> tags), trailing commas,
 * wrapper objects ({ topic: ... }), unclosed JSON, and plain markdown fallback.
 */
export function extractTopicPayload(
	rawText: string,
	fallbackTitle: string,
	fallbackCategory: CategoryType = "Polity",
): StructuredTopic {
	if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
		throw new Error(
			"The AI model returned an empty response. Please retry generation.",
		);
	}

	// 1. Remove reasoning / thought traces from reasoning models (<think>...</think>)
	const clean = rawText
		.replace(/<think>[\s\S]*?<\/think>/gi, "")
		.replace(/<\/?(?:thought|reasoning)[^>]*>/gi, "")
		.trim();

	// 1b. Check if the LLM explicitly refused because the query was off-topic
	const isRefusal =
		/\b(cannot|unable to|can't)\s+(?:generate|create|provide|produce)\s+(?:a\s+)?(?:study\s+note|upsc|ias|answer)/i.test(
			clean,
		) ||
		/\b(not\s+(?:a\s+)?(?:recognized\s+)?upsc|outside\s+(?:the\s+)?(?:upsc|syllabus)|not\s+part\s+of\s+(?:the\s+)?(?:upsc|syllabus)|sports|celebrity|pop\s+culture|entertainment)\b/i.test(
			clean,
		);

	if (isRefusal && clean.length < 500 && !clean.includes('"title"')) {
		throw new Error(
			`The topic "${fallbackTitle}" is outside the UPSC CSE syllabus. Please enter a recognized syllabus topic or public policy issue.`,
		);
	}

	// 2. Extract JSON candidate: Check markdown code fences first
	let jsonCandidate = "";
	const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
	if (fenceMatch?.[1]) {
		jsonCandidate = fenceMatch[1].trim();
	}

	// 3. Fallback: Search for outer curly braces
	if (!jsonCandidate) {
		const firstBrace = clean.indexOf("{");
		const lastBrace = clean.lastIndexOf("}");
		if (firstBrace !== -1 && lastBrace > firstBrace) {
			jsonCandidate = clean.slice(firstBrace, lastBrace + 1).trim();
		}
	}

	// 4. Try parsing JSON if candidate was located
	if (jsonCandidate) {
		// Attempt A: Direct JSON.parse
		try {
			const parsed = JSON.parse(jsonCandidate);
			const unwrapped = unwrapTopicPayload(parsed);
			return StructuredTopicSchema.parse(unwrapped);
		} catch {
			// Attempt B: Cleanup trailing commas
			try {
				const relaxed = jsonCandidate.replace(/,\s*([}\]])/g, "$1").trim();
				const parsed = JSON.parse(relaxed);
				const unwrapped = unwrapTopicPayload(parsed);
				return StructuredTopicSchema.parse(unwrapped);
			} catch {
				// Attempt C: Repair unclosed braces / brackets from truncated streams
				try {
					let repaired = jsonCandidate.replace(/,\s*$/, "");
					const openCurly = (repaired.match(/\{/g) || []).length;
					const closeCurly = (repaired.match(/\}/g) || []).length;
					const openSquare = (repaired.match(/\[/g) || []).length;
					const closeSquare = (repaired.match(/\]/g) || []).length;

					for (let i = 0; i < openSquare - closeSquare; i++) {
						repaired += "]";
					}
					for (let i = 0; i < openCurly - closeCurly; i++) {
						repaired += "}";
					}

					const parsed = JSON.parse(repaired);
					const unwrapped = unwrapTopicPayload(parsed);
					return StructuredTopicSchema.parse(unwrapped);
				} catch {
					// Fall through to markdown parser
				}
			}
		}
	}

	// 5. Fallback: Parse markdown response using parseMarkdownToTopic
	try {
		const mdTopic = parseMarkdownToTopic(
			clean,
			fallbackTitle,
			fallbackCategory,
		);
		const hasRealMeaning =
			mdTopic?.meaning &&
			mdTopic.meaning !== "Definition processing completed." &&
			clean.toLowerCase().includes(mdTopic.meaning.slice(0, 20).toLowerCase());

		if (hasRealMeaning) {
			const candidate: Partial<Topic> = {
				...mdTopic,
				title: mdTopic.title || fallbackTitle,
				category: mdTopic.category || fallbackCategory,
				pros: ensureFourItems(mdTopic.pros, "pro", fallbackTitle),
				cons: ensureFourItems(mdTopic.cons, "con", fallbackTitle),
				wayForward:
					Array.isArray(mdTopic.wayForward) && mdTopic.wayForward.length >= 3
						? mdTopic.wayForward.slice(0, 4)
						: [
								"Strengthen institutional capacity through targeted administrative reforms.",
								"Enhance stakeholder consultation and inter-agency coordination.",
								"Adopt digital public infrastructure for transparent tracking.",
							],
				conclusion:
					typeof mdTopic.conclusion === "object" && mdTopic.conclusion !== null
						? mdTopic.conclusion
						: {
								negative:
									"Implementation challenges remain significant in rural contexts.",
								positive:
									"However, robust policy monitoring ensures sustained long-term progress.",
							},
			};

			const validated = StructuredTopicSchema.safeParse(candidate);
			if (validated.success) {
				return validated.data;
			}
		}
	} catch {
		// Fall through to error
	}

	throw new Error(
		"The AI model output could not be parsed into a study note format. Please try again or switch model in Settings.",
	);
}
