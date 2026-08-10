import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const schema = z.object({
	title: z.string(),
	count: z.number().int(),
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

vi.mock("../../src/services/llm/provider.ts", async () => {
	const actual = await vi.importActual("../../src/services/llm/provider.ts");
	return {
		...actual,
		getLanguageModel: vi.fn(() => ({})),
	};
});

vi.mock("ai", async () => {
	const actual = await vi.importActual("ai");
	return {
		...actual,
		generateObject: vi.fn(),
	};
});

describe("generateStructuredCompletion (AI SDK)", () => {
	it("returns validated data when the model produces a valid structured object", async () => {
		const { generateObject } = await import("ai");
		const mock = generateObject as unknown as ReturnType<typeof vi.fn>;
		mock.mockResolvedValueOnce({
			object: { title: "Test", count: 3 },
		});

		const { generateStructuredCompletion } = await import("./structured.ts");
		const result = await generateStructuredCompletion(
			{ provider: "openrouter", apiKey: "sk-test", model: "gpt-4o" },
			schema,
			[{ role: "user", content: "Generate" }],
		);

		expect(result).toEqual({ title: "Test", count: 3 });
		expect(generateObject).toHaveBeenCalledTimes(1);
	});

	it("propagates StructuredLLMError when generateObject keeps failing", async () => {
		const { generateObject } = await import("ai");
		const mock = generateObject as unknown as ReturnType<typeof vi.fn>;
		mock.mockRejectedValue(new Error("persistent failure"));

		const { generateStructuredCompletion } = await import("./structured.ts");

		await expect(
			generateStructuredCompletion(
				{ provider: "openrouter", apiKey: "sk-test", model: "gpt-4o" },
				schema,
				[{ role: "user", content: "Generate" }],
				{ maxRetries: 1 },
			),
		).rejects.toThrow(/Failed to get a valid structured response/);
	});
});
