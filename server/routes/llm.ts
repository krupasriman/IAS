import { generateText, type ModelMessage } from "ai";
import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { getLanguageModel } from "../../src/services/llm/provider.ts";
import { logger } from "../../src/utils/logger.ts";
import { resolveLlmApiKey } from "../services/keyResolver.ts";
import { sendError, sendServerError } from "../utils/errors.ts";
import { validateLLMRequest } from "../validation/llm.middleware.ts";
import type { LLMRequest } from "../validation/llm.ts";

const router = Router();

router.post(
	"/llm",
	validateLLMRequest,
	async (req: ExpressRequest, res: Response) => {
		try {
			const request = req.body as LLMRequest;
			const resolvedApiKey = await resolveLlmApiKey(
				request.provider,
				request.apiKey,
			);
			if (!resolvedApiKey) {
				sendError(res, 400, "No API key configured for this provider");
				return;
			}
			logger.info(
				{ provider: request.provider, model: request.model },
				"LLM proxy request",
			);

			const model = getLanguageModel({
				provider: request.provider,
				apiKey: resolvedApiKey,
				model: request.model,
				baseUrl: request.baseUrl,
			});

			const systemMessage = request.messages.find(
				(m) => m.role === "system",
			)?.content;
			const otherMessages = request.messages.filter(
				(m) => m.role !== "system",
			) as ModelMessage[];

			const result = await generateText({
				model,
				system: systemMessage,
				messages: otherMessages,
				temperature: request.temperature,
				maxOutputTokens: 4000,
			});

			res.status(200).json({ content: result.text });
		} catch (error: unknown) {
			const message =
				typeof error === "object" && error !== null && "message" in error
					? String((error as { message: unknown }).message)
					: "Failed to process LLM request";
			logger.error({ err: message }, "Failed to process LLM request");
			sendServerError(res, message);
		}
	},
);

export default router;
