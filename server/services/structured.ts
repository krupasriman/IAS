import { generateObject, type ModelMessage } from "ai";
import type { ZodType } from "zod";
import {
	getLanguageModel,
	type ProviderConfig,
} from "../../src/services/llm/provider";
import { logger } from "../../src/utils/logger";

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

export type StructuredMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export async function generateStructuredCompletion<T>(
	config: ProviderConfig,
	schema: ZodType<T>,
	messages: StructuredMessage[],
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
			const result = await generateObject({
				model,
				schema,
				system: systemMessage,
				messages: otherMessages,
				mode: "json",
			});
			logger.info({ attempt: attempt + 1 }, "LLM structured output validated");
			return result.object as T;
		} catch (err) {
			lastError = err instanceof Error ? err.message : String(err);
			logger.warn({ attempt, err: lastError }, "Structured output call failed");
			if (attempt === maxRetries) {
				throw new StructuredLLMError(
					`Failed to get a valid structured response after ${maxRetries} retries: ${lastError}`,
					[lastError],
				);
			}
		}
	}

	throw new StructuredLLMError(
		`Failed to get a valid structured response after ${maxRetries} retries`,
		[lastError],
	);
}
