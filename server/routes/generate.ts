import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { logger } from "../../src/utils/logger";
import { validateTopicRelevance } from "../../src/utils/topicGuardrail";
import {
	CategorySchema,
	formatTopicValidationError,
	LlmTopicSchema,
	StructuredTopicSchema,
	unwrapTopicPayload,
} from "../../src/utils/topicSchema";
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from "../prompts/prompts";
import {
	generateTopicCacheKey,
	getCachedTopic,
	setCachedTopic,
} from "../services/cache/llmCache";
import { classifySyllabusRelevance } from "../services/guardrail/syllabusClassifier";
import { resolveLlmApiKey } from "../services/keyResolver";
import { executeStructuredWithFallback } from "../services/llm/fallbackRouter";
import { sendError } from "../utils/errors";
import { LLMProviderSchema } from "../validation/llm";

const GenerateRequestSchema = z.object({
	topic: z.string().min(1).max(200),
	category: CategorySchema.optional(),
	webContext: z.string().optional(),
	provider: LLMProviderSchema,
	apiKey: z.string().min(1).optional(),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).optional(),
	baseUrl: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().url().optional(),
	),
	maxRetries: z.number().int().min(0).max(10).optional(),
	forceRefresh: z.boolean().optional(),
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
		forceRefresh,
	} = parsed.data;

	const relevance = validateTopicRelevance(topic);
	if (!relevance.isRelevant) {
		sendError(
			res,
			400,
			relevance.reason ||
				"The query is not a recognized UPSC / IAS syllabus topic.",
		);
		return;
	}

	const cacheKey = generateTopicCacheKey(topic, category, webContext);
	if (!forceRefresh) {
		const cached = await getCachedTopic(cacheKey);
		if (cached) {
			res.status(200).json({ topic: cached, cached: true });
			return;
		}
	}

	const messages = [
		{ role: "system" as const, content: IAS_SYSTEM_PROMPT },
		{
			role: "user" as const,
			content: buildUserPrompt(topic, category, webContext),
		},
	];

	try {
		const resolvedApiKey = await resolveLlmApiKey(
			provider,
			apiKey,
			req.authUser?.id,
		);
		if (!resolvedApiKey) {
			sendError(res, 400, "No API key configured for this provider");
			return;
		}

		const classification = await classifySyllabusRelevance(
			topic,
			provider,
			resolvedApiKey,
			model,
			baseUrl,
		);
		if (!classification.isValid) {
			sendError(
				res,
				400,
				classification.reason ||
					"This topic is outside the UPSC Civil Services Examination curriculum.",
			);
			return;
		}

		const { result: structured, usedProvider } =
			await executeStructuredWithFallback(
				{ provider, apiKey: resolvedApiKey, model, baseUrl },
				LlmTopicSchema,
				messages,
				{ maxRetries },
				req.authUser?.id,
			);

		const unwrapped = unwrapTopicPayload(structured);
		const validatedTopic = StructuredTopicSchema.parse(unwrapped);

		const now = new Date().toISOString();
		const finalTopic = {
			...validatedTopic,
			id: crypto.randomUUID(),
			source: "web" as const,
			createdAt: now,
			updatedAt: now,
		};

		// Populate cache asynchronously
		void setCachedTopic(cacheKey, finalTopic);

		res.status(200).json({
			topic: finalTopic,
			provider: usedProvider,
		});
	} catch (error: unknown) {
		const message = formatTopicValidationError(error);
		logger.error(
			{ err: message, retries: maxRetries },
			"Structured topic generation failed",
		);
		sendError(res, 502, message);
	}
});

export default router;
