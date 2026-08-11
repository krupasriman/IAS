import { generateObject, type ModelMessage, NoObjectGeneratedError } from "ai";
import type { ZodType } from "zod";
import {
	getLanguageModel,
	type ProviderConfig,
} from "../../src/services/llm/provider.ts";
import {
	DEFAULT_MAX_TOKENS,
	DEFAULT_TEMPERATURE,
} from "../../src/services/llm/providerDefaults.ts";
import { logger } from "../../src/utils/logger.ts";

export const MAX_STRUCTURED_RETRIES = 2;

export class StructuredLLMError extends Error {
	lastValidation: string[];
	constructor(message: string, lastValidation: string[]) {
		super(message);
		this.name = "StructuredLLMError";
		this.lastValidation = lastValidation;
	}
}

export interface StructuredGenerateOptions {
	maxRetries?: number;
}

export async function generateStructuredCompletion<T>(
	config: ProviderConfig,
	schema: ZodType<T>,
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	options: StructuredGenerateOptions = {},
): Promise<T> {
	const maxRetries = options.maxRetries ?? MAX_STRUCTURED_RETRIES;
	const model = getLanguageModel(config);

	const systemMessage = messages.find((m) => m.role === "system")?.content;
	const otherMessages = messages.filter(
		(m) => m.role !== "system",
	) as ModelMessage[];

	let lastError = "";
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		if (attempt > 0) {
			logger.warn({ attempt, maxRetries }, "LLM structured output retry");
		}
		try {
			const { object } = await generateObject({
				model,
				schema,
				system: systemMessage,
				messages: otherMessages,
				temperature: DEFAULT_TEMPERATURE,
				maxOutputTokens: DEFAULT_MAX_TOKENS,
			});
			logger.info({ attempt: attempt + 1 }, "LLM structured output validated");
			return object as T;
		} catch (err) {
			if (NoObjectGeneratedError.isInstance(err)) {
				lastError = err.message;
				logger.warn({ attempt, err: err.message }, "NoObjectGeneratedError");
			} else {
				const message = err instanceof Error ? err.message : String(err);
				lastError = message;
				if (attempt === maxRetries) {
					throw new StructuredLLMError(
						`Failed to get a valid structured response after ${maxRetries} retries: ${message}`,
						[message],
					);
				}
			}
		}
	}
	throw new StructuredLLMError(
		`Failed to get a valid structured response after ${maxRetries} retries`,
		[lastError],
	);
}
