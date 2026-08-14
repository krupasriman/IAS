import { z } from "zod";

export const QuoteSchema = z.object({
	text: z.string().min(1).max(500),
	source: z.string().min(1).max(200),
});

export const ProConItemSchema = z.object({
	title: z.string().min(1).max(80),
	explanation: z.string().min(1).max(300),
	example: z.string().min(1).max(300),
});

export const ConclusionSchema = z.object({
	negative: z.string().min(1).max(500),
	positive: z.string().min(1).max(500),
});

export const VALID_CATEGORIES = [
	"Polity",
	"History",
	"Geography",
	"Economy",
	"Ethics",
	"Governance",
	"IR",
	"Society",
	"Environment",
	"Science & Tech",
	"Internal Security",
	"Sociology",
	"Disaster Management",
] as const;

export const CategorySchema = z.enum(VALID_CATEGORIES);

/** Maps common LLM category variations to canonical names */
const CATEGORY_ALIASES: Record<string, (typeof VALID_CATEGORIES)[number]> = {
	polity: "Polity",
	history: "History",
	geography: "Geography",
	economy: "Economy",
	economics: "Economy",
	ethics: "Ethics",
	governance: "Governance",
	ir: "IR",
	"international relations": "IR",
	society: "Society",
	social: "Society",
	"social issues": "Society",
	environment: "Environment",
	ecology: "Environment",
	"environment & ecology": "Environment",
	"environment and ecology": "Environment",
	"science & tech": "Science & Tech",
	"science and tech": "Science & Tech",
	"science & technology": "Science & Tech",
	"science and technology": "Science & Tech",
	science: "Science & Tech",
	technology: "Science & Tech",
	"sci & tech": "Science & Tech",
	"internal security": "Internal Security",
	security: "Internal Security",
	"internal-security": "Internal Security",
	"national security": "Internal Security",
	sociology: "Sociology",
	"sociology & social structure": "Sociology",
	"disaster management": "Disaster Management",
	disaster: "Disaster Management",
	"disaster-management": "Disaster Management",
	dm: "Disaster Management",
};

export function normalizeCategory(value: string): string {
	const lower = value.trim().toLowerCase();
	return CATEGORY_ALIASES[lower] ?? value.trim();
}

/** Category schema that normalizes common LLM variations before validation */
export const FlexibleCategorySchema = z.preprocess(
	(val) => (typeof val === "string" ? normalizeCategory(val) : val),
	CategorySchema,
);

export const LlmTopicSchema = z.object({
	title: z.string().min(1).max(200),
	category: z
		.string()
		.describe(
			`Category of the topic. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
		),
	meaning: z.string().min(1).max(2000),
	quote: QuoteSchema,
	pros: z.array(ProConItemSchema).length(4),
	cons: z.array(ProConItemSchema).length(4),
	wayForward: z
		.array(z.string())
		.min(3)
		.max(4)
		.describe(
			"Exactly 3 to 4 distinct actionable steps or policy recommendations",
		),
	conclusion: ConclusionSchema,
});

export const StructuredTopicSchema = LlmTopicSchema.extend({
	category: FlexibleCategorySchema,
});

export type StructuredTopic = z.infer<typeof StructuredTopicSchema>;
