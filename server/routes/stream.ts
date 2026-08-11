import {
	createTextStreamResponse,
	type ModelMessage,
	pipeTextStreamToResponse,
	streamText,
} from "ai";
import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { getLanguageModel } from "../../src/services/llm/provider.ts";
import { logger } from "../../src/utils/logger.ts";
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from "../../src/utils/prompts.ts";
import { CategorySchema } from "../../src/utils/topicSchema.ts";
import { resolveLlmApiKey } from "../services/keyResolver.ts";
import { sendError } from "../utils/errors.ts";
import { LLMProviderSchema } from "../validation/llm.ts";

const StreamRequestSchema = z.object({
	topic: z.string().min(1).max(200),
	category: CategorySchema.optional(),
	webContext: z.string().optional(),
	provider: LLMProviderSchema,
	apiKey: z.string().min(1).optional(),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).optional(),
	baseUrl: z.string().url().optional(),
});

const router = Router();

router.post("/generate/stream", async (req: ExpressRequest, res: Response) => {
	const parsed = StreamRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		const details: Record<string, string[]> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "body";
			if (!details[key]) {
				details[key] = [];
			}
			details[key].push(issue.message);
		}
		sendError(res, 400, "Invalid stream request", details);
		return;
	}

	const {
		topic,
		category,
		webContext,
		provider,
		apiKey,
		model,
		temperature,
		baseUrl,
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
		const systemMessage = messages.find((m) => m.role === "system")?.content;
		const otherMessages = messages.filter(
			(m) => m.role !== "system",
		) as ModelMessage[];

		const languageModel = getLanguageModel({
			provider,
			apiKey: resolvedApiKey,
			model,
			baseUrl,
		});

		const result = streamText({
			model: languageModel,
			system: systemMessage,
			messages: otherMessages,
			temperature: temperature ?? 0.3,
			onError: ({ error }) => {
				logger.error({ err: String(error) }, "AI SDK stream error");
			},
		});

		await pipeTextStreamToResponse({
			response: res as unknown as Parameters<
				typeof pipeTextStreamToResponse
			>[0]["response"],
			stream: result.textStream,
		});
	} catch (error: unknown) {
		const message =
			typeof error === "object" && error !== null && "message" in error
				? String((error as { message: unknown }).message)
				: "Streaming failed";
		logger.error({ err: message }, "Stream error");
		if (!res.headersSent) {
			sendError(res, 500, message);
		}
	}
});

// Reference to avoid unused import error
void createTextStreamResponse;

export default router;
