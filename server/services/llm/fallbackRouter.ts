import type { ZodType } from "zod";
import { LLM_PROVIDERS } from "../../../src/config/providers";
import type {
	LLMProvider,
	ProviderConfig,
} from "../../../src/services/llm/provider";
import { logger } from "../../../src/utils/logger";
import { recordLlmMetrics } from "../../utils/metrics";
import { resolveLlmApiKey } from "../keyResolver";
import {
	generateStructuredCompletion,
	type StructuredGenerateOptions,
	type StructuredMessage,
} from "../structured";

const ALL_PROVIDERS: LLMProvider[] = ["groq", "openrouter", "generalcompute"];

export function getFallbackChain(primary: LLMProvider): LLMProvider[] {
	return ALL_PROVIDERS.filter((p) => p !== primary);
}

export function isRetryableUpstreamError(error: unknown): boolean {
	if (!error) return false;
	const msg =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase();
	return (
		msg.includes("429") ||
		msg.includes("rate limit") ||
		msg.includes("quota") ||
		msg.includes("500") ||
		msg.includes("502") ||
		msg.includes("503") ||
		msg.includes("504") ||
		msg.includes("timeout") ||
		msg.includes("etimedout") ||
		msg.includes("econnreset") ||
		msg.includes("fetch failed") ||
		msg.includes("upstream")
	);
}

export async function executeStructuredWithFallback<T>(
	primaryConfig: ProviderConfig,
	schema: ZodType<T>,
	messages: StructuredMessage[],
	options: StructuredGenerateOptions = {},
	userId?: string,
): Promise<{ result: T; usedProvider: LLMProvider }> {
	const primaryStart = Date.now();
	try {
		const result = await generateStructuredCompletion(
			primaryConfig,
			schema,
			messages,
			options,
		);
		recordLlmMetrics({
			provider: primaryConfig.provider,
			model: primaryConfig.model || "default",
			durationMs: Date.now() - primaryStart,
			status: "success",
		});
		return { result, usedProvider: primaryConfig.provider };
	} catch (primaryErr) {
		recordLlmMetrics({
			provider: primaryConfig.provider,
			model: primaryConfig.model || "default",
			durationMs: Date.now() - primaryStart,
			status: "error",
		});

		if (!isRetryableUpstreamError(primaryErr)) {
			throw primaryErr;
		}

		logger.warn(
			{
				provider: primaryConfig.provider,
				err:
					primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
			},
			"Primary LLM provider failed with retryable error; initiating failover",
		);

		const fallbacks = getFallbackChain(primaryConfig.provider);

		for (const fallbackProvider of fallbacks) {
			const fallbackKey = await resolveLlmApiKey(
				fallbackProvider,
				undefined,
				userId,
			);
			if (!fallbackKey) continue;

			const providerInfo = LLM_PROVIDERS.find((p) => p.id === fallbackProvider);
			const fallbackModel = providerInfo?.defaultModel || "gpt-oss-120b";
			const fallbackBaseUrl = providerInfo?.defaultBaseUrl;

			logger.info(
				{
					from: primaryConfig.provider,
					to: fallbackProvider,
					model: fallbackModel,
				},
				"Failing over to secondary LLM provider",
			);

			const fallbackStart = Date.now();
			try {
				const result = await generateStructuredCompletion(
					{
						provider: fallbackProvider,
						apiKey: fallbackKey,
						model: fallbackModel,
						baseUrl: fallbackBaseUrl,
					},
					schema,
					messages,
					options,
				);
				recordLlmMetrics({
					provider: fallbackProvider,
					model: fallbackModel,
					durationMs: Date.now() - fallbackStart,
					status: "success",
				});
				return { result, usedProvider: fallbackProvider };
			} catch (fallbackErr) {
				recordLlmMetrics({
					provider: fallbackProvider,
					model: fallbackModel,
					durationMs: Date.now() - fallbackStart,
					status: "error",
				});
				logger.warn(
					{
						fallbackProvider,
						err:
							fallbackErr instanceof Error
								? fallbackErr.message
								: String(fallbackErr),
					},
					"Fallback LLM provider failed, trying next candidate",
				);
			}
		}

		// If all fail, throw the original primary error
		throw primaryErr;
	}
}
