import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as keyResolver from "../keyResolver";
import * as structured from "../structured";
import {
	executeStructuredWithFallback,
	getFallbackChain,
	isRetryableUpstreamError,
} from "./fallbackRouter";

describe("fallbackRouter", () => {
	it("identifies retryable upstream errors correctly", () => {
		expect(isRetryableUpstreamError(new Error("Rate limit exceeded 429"))).toBe(
			true,
		);
		expect(
			isRetryableUpstreamError(
				new Error("503 Service Temporarily Unavailable"),
			),
		).toBe(true);
		expect(isRetryableUpstreamError(new Error("network timeout"))).toBe(true);
		expect(isRetryableUpstreamError(new Error("Invalid API key"))).toBe(false);
	});

	it("returns correct fallback chain excluding primary", () => {
		expect(getFallbackChain("groq")).toEqual(["openrouter", "generalcompute"]);
		expect(getFallbackChain("openrouter")).toEqual(["groq", "generalcompute"]);
	});

	it("returns primary result when primary succeeds", async () => {
		vi.spyOn(structured, "generateStructuredCompletion").mockResolvedValueOnce({
			val: "ok",
		});

		const testSchema = z.object({ val: z.string() });
		const outcome = await executeStructuredWithFallback(
			{ provider: "groq", apiKey: "gsk_test", model: "model-1" },
			testSchema,
			[{ role: "user", content: "test" }],
		);

		expect(outcome.result).toEqual({ val: "ok" });
		expect(outcome.usedProvider).toBe("groq");
	});

	it("fails over to secondary provider when primary encounters 429", async () => {
		vi.spyOn(structured, "generateStructuredCompletion")
			.mockRejectedValueOnce(new Error("429 Too Many Requests"))
			.mockResolvedValueOnce({ val: "fallback-ok" });

		vi.spyOn(keyResolver, "resolveLlmApiKey").mockResolvedValueOnce(
			"openrouter-key",
		);

		const testSchema = z.object({ val: z.string() });
		const outcome = await executeStructuredWithFallback(
			{ provider: "groq", apiKey: "gsk_test", model: "model-1" },
			testSchema,
			[{ role: "user", content: "test" }],
		);

		expect(outcome.result).toEqual({ val: "fallback-ok" });
		expect(outcome.usedProvider).toBe("openrouter");
	});
});
