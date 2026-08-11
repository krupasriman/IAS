import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { logger } from "../../src/utils/logger.ts";
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from "../../src/utils/prompts.ts";
import {
	CategorySchema,
	LlmTopicSchema,
	StructuredTopicSchema,
} from "../../src/utils/topicSchema.ts";
import { resolveLlmApiKey } from "../services/keyResolver.ts";
import { generateStructuredCompletion } from "../services/structured.ts";
import { sendError } from "../utils/errors.ts";
import { LLMProviderSchema } from "../validation/llm.ts";

const GenerateRequestSchema = z.object({
	topic: z.string().min(1).max(200),
	category: CategorySchema.optional(),
	webContext: z.string().optional(),
	provider: LLMProviderSchema,
	apiKey: z.string().min(1).optional(),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).optional(),
	baseUrl: z.string().url().optional(),
	maxRetries: z.number().int().min(0).max(10).optional(),
});

const router = Router();

router.post("/generate", async (req: ExpressRequest, res: Response) => {
	const parsed = GenerateRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		const details: Record<string, string[]> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "body";
			if (!details[key]) {
				details[key] = [];
			}
			details[key].push(issue.message);
		}
		sendError(res, 400, "Invalid generate request", details);
		return;
	}

	const {
		topic,
		category,
		webContext,
		provider,
		apiKey,
		model,
		baseUrl,
		maxRetries,
	} = parsed.data;

	const messages = [
		{ role: "system" as const, content: IAS_SYSTEM_PROMPT },
		{
			role: "user" as const,
			content: buildUserPrompt(topic, category, webContext),
		},
	];

	try {
		const resolvedApiKey = await resolveLlmApiKey(provider, apiKey);
		if (!resolvedApiKey) {
			sendError(res, 400, "No API key configured for this provider");
			return;
		}
		const structured = await generateStructuredCompletion(
			{ provider, apiKey: resolvedApiKey, model, baseUrl },
			LlmTopicSchema,
			messages,
			{ maxRetries },
		);

		const validatedTopic = StructuredTopicSchema.parse(structured);

		const now = new Date().toISOString();
		res.status(200).json({
			topic: {
				...validatedTopic,
				id: crypto.randomUUID(),
				source: "web",
				createdAt: now,
				updatedAt: now,
			},
		});
	} catch (error: unknown) {
		const message =
			typeof error === "object" && error !== null && "message" in error
				? String((error as { message: unknown }).message)
				: "Structured topic generation failed";
		logger.error(
			{ err: message, retries: maxRetries },
			"Structured topic generation failed",
		);
		sendError(res, 502, message);
	}
});

export default router;
