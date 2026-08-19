import { describe, expect, it } from "vitest";
import { getApiKeyPlaceholder, validateApiKeyFormat } from "./apiKeyValidator";

describe("apiKeyValidator", () => {
	it("returns correct placeholders", () => {
		expect(getApiKeyPlaceholder("openrouter")).toBe("sk-or-v1-...");
		expect(getApiKeyPlaceholder("groq")).toBe("gsk_...");
		expect(getApiKeyPlaceholder("generalcompute")).toBe("gc_...");
		expect(getApiKeyPlaceholder("tavily")).toBe("tvly-...");
	});

	it("accepts empty or blank keys (for editing state)", () => {
		expect(validateApiKeyFormat("openrouter", "").isValid).toBe(true);
		expect(validateApiKeyFormat("groq", "   ").isValid).toBe(true);
	});

	it("flags literal placeholder text", () => {
		expect(validateApiKeyFormat("openrouter", "sk-...").isValid).toBe(false);
		expect(validateApiKeyFormat("groq", "gsk_...").isValid).toBe(false);
	});

	it("validates OpenRouter keys", () => {
		expect(
			validateApiKeyFormat(
				"openrouter",
				"sk-or-v1-abcdefghijklmnopqrstuvwxyz1234567890",
			).isValid,
		).toBe(true);
		expect(
			validateApiKeyFormat("openrouter", "gsk_dummytestkey1234567890abcdef")
				.isValid,
		).toBe(false);
		expect(validateApiKeyFormat("openrouter", "invalid-key").isValid).toBe(
			false,
		);
	});

	it("validates Groq keys", () => {
		expect(
			validateApiKeyFormat("groq", "gsk_dummytestkey12345678901234567890abcdef")
				.isValid,
		).toBe(true);
		expect(
			validateApiKeyFormat(
				"groq",
				"sk-or-v1-abcdefghijklmnopqrstuvwxyz1234567890",
			).isValid,
		).toBe(false);
	});

	it("validates Tavily keys", () => {
		expect(validateApiKeyFormat("tavily", "tvly-test12345678").isValid).toBe(
			true,
		);
		expect(validateApiKeyFormat("tavily", "random-key").isValid).toBe(false);
	});
});
