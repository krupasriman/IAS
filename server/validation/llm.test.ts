import { describe, expect, it } from "vitest";
import { getLanguageModel } from "../../src/services/llm/provider.ts";
import { PROVIDER_DEFAULTS } from "../../src/services/llm/providerDefaults.ts";
import { type LLMRequest, LLMRequestSchema } from "./llm.ts";

const validRequest: LLMRequest = {
	provider: "openrouter",
	apiKey: "sk-test",
	model: "gpt-4o",
	messages: [{ role: "user", content: "hello" }],
};

describe("LLMRequestSchema", () => {
	it("accepts a valid request", () => {
		const result = LLMRequestSchema.safeParse(validRequest);
		expect(result.success).toBe(true);
	});

	it("rejects an unknown provider", () => {
		const result = LLMRequestSchema.safeParse({
			...validRequest,
			provider: "unknown",
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing content", () => {
		const result = LLMRequestSchema.safeParse({
			...validRequest,
			messages: [{ role: "user", content: "" }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty messages array", () => {
		const result = LLMRequestSchema.safeParse({
			...validRequest,
			messages: [],
		});
		expect(result.success).toBe(false);
	});

	it("rejects out-of-range temperature", () => {
		const result = LLMRequestSchema.safeParse({
			...validRequest,
			temperature: 3,
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid baseUrl", () => {
		const result = LLMRequestSchema.safeParse({
			...validRequest,
			baseUrl: "not-a-url",
		});
		expect(result.success).toBe(false);
	});
});

describe("PROVIDER_DEFAULTS", () => {
	it("provides URLs for all supported providers", () => {
		expect(PROVIDER_DEFAULTS.openrouter).toMatch(/^https:\/\//);
		expect(PROVIDER_DEFAULTS.groq).toMatch(/^https:\/\//);
		expect(PROVIDER_DEFAULTS.generalcompute).toMatch(/^https:\/\//);
	});
});

describe("getLanguageModel", () => {
	it("returns a LanguageModelV1 instance for each provider", () => {
		for (const provider of ["openrouter", "groq", "generalcompute"] as const) {
			const model = getLanguageModel({
				provider,
				apiKey: "sk-test",
				model: "some-model",
			});
			expect(model).toBeDefined();
			const m = model as unknown as {
				specificationVersion?: unknown;
				provider?: unknown;
			};
			expect(m.specificationVersion ?? m.provider).toBeDefined();
		}
	});
});
