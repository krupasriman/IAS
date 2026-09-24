import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("crypto utility", () => {
	it("encrypts with v1 prefix and decrypts successfully", () => {
		const secret = "sk-ant-api03-sample-test-key-12345";
		const encrypted = encryptSecret(secret);

		expect(encrypted.startsWith("v1:")).toBe(true);
		expect(encrypted.split(":")).toHaveLength(4);

		const decrypted = decryptSecret(encrypted);
		expect(decrypted).toBe(secret);
	});

	it("throws on corrupted or malformed payloads", () => {
		expect(() => decryptSecret("corrupted-payload")).toThrow();
		expect(() => decryptSecret("v1:bad:payload")).toThrow();
	});
});
