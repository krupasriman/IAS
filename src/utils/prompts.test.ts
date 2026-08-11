import { describe, expect, it } from "vitest";
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from "./prompts";

describe("buildUserPrompt", () => {
	it("includes topic and category", () => {
		const prompt = buildUserPrompt("Judicial Review", "Polity");

		expect(prompt).toContain("Topic: Judicial Review");
		expect(prompt).toContain("Category: Polity");
	});

	it("omits category line when not provided", () => {
		const prompt = buildUserPrompt("Judicial Review");

		expect(prompt).not.toContain("Category:");
	});

	it("appends web context when provided", () => {
		const prompt = buildUserPrompt(
			"Judicial Review",
			"Polity",
			"Recent SC judgment in 2025",
		);

		expect(prompt).toContain("Web Search Results for context:");
		expect(prompt).toContain("Recent SC judgment in 2025");
		expect(prompt).toContain("utilize key facts");
	});

	it("omits web context when blank", () => {
		const prompt = buildUserPrompt("Judicial Review", "Polity", "   ");

		expect(prompt).not.toContain("Web Search Results");
	});

	it("always instructs the strict JSON format", () => {
		const prompt = buildUserPrompt("Judicial Review");

		expect(prompt).toContain("JSON object");
	});
});

describe("IAS_SYSTEM_PROMPT", () => {
	it("demands 4 pros and 4 cons", () => {
		expect(IAS_SYSTEM_PROMPT).toContain("4 distinct Pros and 4 distinct Cons");
	});

	it("specifies strict JSON output format", () => {
		expect(IAS_SYSTEM_PROMPT).toContain("### OUTPUT FORMAT (STRICT JSON)");
		expect(IAS_SYSTEM_PROMPT).toContain('"meaning"');
		expect(IAS_SYSTEM_PROMPT).toContain('"quote"');
		expect(IAS_SYSTEM_PROMPT).toContain('"pros"');
		expect(IAS_SYSTEM_PROMPT).toContain('"cons"');
		expect(IAS_SYSTEM_PROMPT).toContain('"wayForward"');
		expect(IAS_SYSTEM_PROMPT).toContain('"conclusion"');
	});

	it("embeds the generated JSON schema as the single source of truth", () => {
		expect(IAS_SYSTEM_PROMPT).toContain('"minItems": 4');
		expect(IAS_SYSTEM_PROMPT).toContain('"additionalProperties": false');
		expect(IAS_SYSTEM_PROMPT).toContain('"Polity"');
	});
});
