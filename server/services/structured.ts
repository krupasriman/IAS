import {
	AIMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import type { ZodType } from "zod";
import { getLangChainModel } from "../../src/services/llm/langchainProvider";
import type { ProviderConfig } from "../../src/services/llm/provider";
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

type StructuredMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

function toLangChainMessages(messages: StructuredMessage[]) {
	return messages.map((m) => {
		if (m.role === "system") {
			return new SystemMessage({ content: m.content });
		}
		if (m.role === "user") {
			return new HumanMessage({ content: m.content });
		}
		return new AIMessage({ content: m.content });
	});
}

export async function generateStructuredCompletion<T>(
	config: ProviderConfig,
	schema: ZodType<T>,
	messages: StructuredMessage[],
	options: StructuredGenerateOptions = {},
): Promise<T> {
	const maxRetries = options.maxRetries ?? MAX_STRUCTURED_RETRIES;
	const model = getLangChainModel(config);

	const structured = model.withStructuredOutput(schema, {
		name: "ias_topic",
		method: "jsonMode",
	});
	const langMessages = toLangChainMessages(messages);

	let lastError = "";
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		if (attempt > 0) {
			logger.warn({ attempt, maxRetries }, "LLM structured output retry");
		}
		try {
			const object = (await structured.invoke(langMessages)) as T;
			logger.info({ attempt: attempt + 1 }, "LLM structured output validated");
			return object;
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
