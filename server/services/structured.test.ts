import type { ChatOpenAI } from "@langchain/openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getLangChainModel } from "../../src/services/llm/langchainProvider";
import { generateStructuredCompletion, StructuredLLMError } from "./structured";

vi.mock("../../src/services/llm/langchainProvider.ts", () => ({
	getLangChainModel: vi.fn(),
}));

const mockGetLangChainModel = getLangChainModel as unknown as ReturnType<
	typeof vi.fn
>;

const schema = z.object({
	title: z.string(),
	count: z.number().int(),
});

afterEach(() => {
	vi.restoreAllMocks();
});

function makeFakeModel(
	invoke: ReturnType<typeof vi.fn>,
): ReturnType<typeof vi.fn> {
	const withStructuredOutput = vi.fn().mockReturnValue({ invoke });
	const fakeModel = { withStructuredOutput };
	mockGetLangChainModel.mockReturnValue(fakeModel as unknown as ChatOpenAI);
	return withStructuredOutput;
}

describe("generateStructuredCompletion (LangChain)", () => {
	it("returns the parsed object when structured output succeeds", async () => {
		const invoke = vi.fn().mockResolvedValue({ title: "Test", count: 3 });
		const withStructuredOutput = makeFakeModel(invoke);

		const result = await generateStructuredCompletion(
			{ provider: "openrouter", apiKey: "sk-test", model: "gpt-4o" },
			schema,
			[{ role: "user", content: "Generate" }],
		);

		expect(result).toEqual({ title: "Test", count: 3 });
		expect(mockGetLangChainModel).toHaveBeenCalledTimes(1);
		expect(withStructuredOutput).toHaveBeenCalledTimes(1);
		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it("propagates StructuredLLMError when structured output keeps failing", async () => {
		const invoke = vi.fn().mockRejectedValue(new Error("persistent failure"));
		makeFakeModel(invoke);

		let thrown: unknown;
		try {
			await generateStructuredCompletion(
				{ provider: "openrouter", apiKey: "sk-test", model: "gpt-4o" },
				schema,
				[{ role: "user", content: "Generate" }],
				{ maxRetries: 1 },
			);
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toBeInstanceOf(StructuredLLMError);
		expect((thrown as StructuredLLMError).lastValidation).toEqual([
			"persistent failure",
		]);
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});
