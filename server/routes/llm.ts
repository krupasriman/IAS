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
				req.authUser?.id,
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
				if (
					typeof errObj.statusCode === "number" &&
					errObj.statusCode >= 400 &&
					errObj.statusCode < 600
				) {
					statusCode = errObj.statusCode;
				} else if (
					typeof errObj.status === "number" &&
					errObj.status >= 400 &&
					errObj.status < 600
				) {
					statusCode = errObj.status;
				}

				if (errObj.responseBody) {
					try {
						const parsed = JSON.parse(errObj.responseBody);
						if (typeof parsed?.error?.message === "string") {
							message = parsed.error.message;
						} else if (typeof parsed?.error === "string") {
							message = parsed.error;
						} else if (typeof errObj.message === "string") {
							message = errObj.message;
						}
					} catch {
						message =
							typeof errObj.message === "string"
								? errObj.message
								: "Upstream LLM provider returned an unparseable response";
					}
				} else if (typeof errObj.message === "string") {
					message = errObj.message;
				}
			}

			const provider =
				(req.body as Partial<LLMRequest>)?.provider || "provider";
			if (
				message.includes("Missing Authentication header") ||
				message.includes("No API key") ||
				message.includes("Unauthorized") ||
				message.includes("unauthorized")
			) {
				message = `Invalid or missing API key for ${provider}. Please verify your ${provider.toUpperCase()} API key in Settings.`;
				statusCode = 400;
			} else if (
				message.includes("Upstream idle timeout") ||
				message.includes("ETIMEDOUT")
			) {
				message =
					"Upstream provider timed out due to high traffic on free models. Please retry or select another model.";
				statusCode = 504;
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
