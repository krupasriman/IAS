import { z } from "zod";
import { VALID_CATEGORIES } from "./topicSchema";

const ProConItemFormSchema = z.object({
	title: z.string().trim().min(1, "Title is required"),
	explanation: z.string().trim().min(1, "Explanation is required"),
	example: z.string().trim(),
});

export const TopicFormSchema = z.object({
	title: z.string().trim().min(1, "Title is required"),
	category: z.enum(VALID_CATEGORIES),
	meaning: z.string().trim().min(1, "Meaning is required"),
	quoteText: z.string().trim().min(1, "Quote text is required"),
	quoteSource: z.string().trim(),
	wayForward: z.string().trim().min(1, "Way Forward is required"),
	conclusionNegative: z.string().trim().min(1, "Conclusion line 1 is required"),
	conclusionPositive: z.string().trim().min(1, "Conclusion line 2 is required"),
	pros: z.array(ProConItemFormSchema).min(1, "At least one Pro is required"),
	cons: z.array(ProConItemFormSchema).min(1, "At least one Con is required"),
	tags: z.string(),
});

export type TopicFormValues = z.infer<typeof TopicFormSchema>;

export const EMPTY_PRO_CON = {
	title: "",
	explanation: "",
	example: "",
} as const;
