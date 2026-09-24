import { generateObject } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructuredCompletion, StructuredLLMError } from "./structured";

vi.mock("ai", async (importOriginal) => {
	const actual = await importOriginal<typeof import("ai")>();
	return {
		...actual,
		generateObject: vi.fn(),
	};
});

const mockGenerateObject = vi.mocked(generateObject);

const schema = z.object({
	title: z.string(),
	count: z.number().int(),
});

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("generateStructuredCompletion (AI SDK Core)", () => {
	it("returns the parsed object when structured output succeeds", async () => {
		mockGenerateObject.mockResolvedValueOnce({
			object: { title: "Test", count: 3 },
		} as unknown as Awaited<ReturnType<typeof generateObject>>);

		const result = await generateStructuredCompletion(
			{ provider: "openrouter", apiKey: "sk-test", model: "gpt-4o" },
			schema,
			[{ role: "user", content: "Generate" }],
		);

		expect(result).toEqual({ title: "Test", count: 3 });
		expect(mockGenerateObject).toHaveBeenCalledTimes(1);
	});

	it("propagates StructuredLLMError when structured output keeps failing", async () => {
		mockGenerateObject.mockRejectedValue(new Error("persistent failure"));

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
		expect(mockGenerateObject).toHaveBeenCalledTimes(2);
	});
});
