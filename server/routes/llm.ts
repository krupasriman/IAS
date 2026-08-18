import { generateText, type ModelMessage } from "ai";
import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { getLanguageModel } from "../../src/services/llm/provider";
import { logger } from "../../src/utils/logger";
import { resolveLlmApiKey } from "../services/keyResolver";
import { sendError } from "../utils/errors";
import type { LLMRequest } from "../validation/llm";
import { validateLLMRequest } from "../validation/llm.middleware";

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
			let statusCode = 502;
			let message = "Failed to process LLM request";

			if (typeof error === "object" && error !== null) {
				const errObj = error as {
					statusCode?: number;
					status?: number;
					message?: string;
					responseBody?: string;
				};
				if (typeof errObj.statusCode === "number" && errObj.statusCode >= 400) {
					statusCode = errObj.statusCode;
				} else if (typeof errObj.status === "number" && errObj.status >= 400) {
					statusCode = errObj.status;
				}

				if (errObj.responseBody) {
					try {
						const parsed = JSON.parse(errObj.responseBody);
						if (parsed?.error?.message) {
							message = parsed.error.message;
						} else if (typeof parsed?.error === "string") {
							message = parsed.error;
						} else if (errObj.message) {
							message = errObj.message;
						}
					} catch {
						message = errObj.message || errObj.responseBody;
					}
				} else if (errObj.message) {
					message = errObj.message;
				}
			}

			logger.error(
				{ err: message, statusCode },
				"Failed to process LLM request",
			);
			sendError(res, statusCode, message);
		}
	},
);

export default router;
