import { describe, expect, it } from "vitest";
import { structuredTopicJsonSchema } from "./jsonSchema";

describe("structuredTopicJsonSchema", () => {
	it("produces a valid JSON schema with required top-level keys", () => {
		expect(structuredTopicJsonSchema).toBeDefined();
		const def = structuredTopicJsonSchema as unknown as {
			required?: string[];
		};
		const required: string[] = def.required ?? [];
		for (const key of [
			"title",
			"category",
			"meaning",
			"quote",
			"pros",
			"cons",
			"wayForward",
			"conclusion",
		]) {
			expect(required).toContain(key);
		}
	});

	it("encodes pros and cons as arrays of length 4", () => {
		const def = structuredTopicJsonSchema as unknown as {
			properties: {
				pros: { minItems?: number; maxItems?: number };
				cons: { minItems?: number; maxItems?: number };
			};
		};
		expect(def.properties.pros.minItems).toBe(4);
		expect(def.properties.pros.maxItems).toBe(4);
		expect(def.properties.cons.minItems).toBe(4);
		expect(def.properties.cons.maxItems).toBe(4);
	});
});
