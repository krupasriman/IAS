import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../server/app";
import {
	deleteApiKey,
	getApiKey,
	hasAnyActiveKey,
	listConfiguredApiKeys,
	storeApiKey,
} from "../../server/services/apiKeys";
import {
	createSession,
	createUser,
	SESSION_COOKIE,
} from "../../server/services/auth";
import { decryptSecret, encryptSecret } from "../../server/utils/crypto";

describe("BYOK Multi-Tenant Architecture & Key Vault", () => {
	const userA = "usr_tenant_alpha_11111";
	const userB = "usr_tenant_beta_22222";

	describe("1. Server-Side AES-256-GCM Cryptographic Integrity", () => {
		it("should encrypt plaintext into versioned v1 payload with iv and tag", () => {
			const plain = "sk-or-v1-abcdef1234567890abcdef1234567890";
			const encrypted = encryptSecret(plain);

			expect(encrypted.startsWith("v1:")).toBe(true);
			const parts = encrypted.split(":");
			expect(parts.length).toBe(4);
			// parts: ['v1', ivB64, tagB64, dataB64]
			expect(parts[1].length).toBeGreaterThan(10); // 12-byte IV base64
			expect(parts[2].length).toBeGreaterThan(15); // 16-byte GCM tag base64
			expect(parts[3].length).toBeGreaterThan(20);

			// Decrypts accurately
			const decrypted = decryptSecret(encrypted);
			expect(decrypted).toBe(plain);
		});

		it("should throw an error and fail decryption if ciphertext or auth tag is tampered", () => {
			const plain = "secret-super-key";
			const encrypted = encryptSecret(plain);
			const parts = encrypted.split(":");

			// Tamper with data byte
			const tampered = [
				parts[0],
				parts[1],
				parts[2],
				Buffer.from("tampered_bytes_data").toString("base64"),
			].join(":");

			expect(() => decryptSecret(tampered)).toThrow();
		});
	});

	describe("2. Multi-Tenant User Isolation & Zero Leakage", () => {
		it("should isolate User A's API key from User B", async () => {
			const keyA = "mock_test_key_userA_openrouter";
			const keyB = "mock_test_key_userB_groq";

			// Store keys for distinct tenants
			await storeApiKey(userA, "llm", "openrouter", keyA);
			await storeApiKey(userB, "llm", "groq", keyB);

			// User A can resolve their key
			const retrievedA = await getApiKey(userA, "llm", "openrouter");
			expect(retrievedA).toBe(keyA);

			// User B cannot access User A's key
			const crossCheckBtoA = await getApiKey(userB, "llm", "openrouter");
			expect(crossCheckBtoA).toBeNull();

			// User A cannot access User B's key
			const crossCheckAtoB = await getApiKey(userA, "llm", "groq");
			expect(crossCheckAtoB).toBeNull();

			// Check configured providers per tenant
			const configA = await listConfiguredApiKeys(userA);
			expect(configA.llm).toContain("openrouter");
			expect(configA.llm).not.toContain("groq");

			const configB = await listConfiguredApiKeys(userB);
			expect(configB.llm).toContain("groq");
			expect(configB.llm).not.toContain("openrouter");

			// Cleanup
			await deleteApiKey(userA, "llm", "openrouter");
			await deleteApiKey(userB, "llm", "groq");
		}, 20000);

		it("should correctly report hasAnyActiveKey status per user", async () => {
			const tempUser = `usr_temp_${Date.now()}`;
			expect(await hasAnyActiveKey(tempUser)).toBe(false);

			await storeApiKey(tempUser, "llm", "openrouter", "mock_test_key_temp");
			expect(await hasAnyActiveKey(tempUser)).toBe(true);

			await deleteApiKey(tempUser, "llm", "openrouter");
			expect(await hasAnyActiveKey(tempUser)).toBe(false);
		}, 20000);
	});

	describe("3. API Endpoints, Session Security & Zero Client Exposure", () => {
		let sessionA: string;

		beforeAll(async () => {
			const u = await createUser(
				`userA_${Date.now()}@example.com`,
				"Password123!",
			);
			sessionA = await createSession(u);
		});

		it("should reject unauthenticated requests with 401 when AUTH_MODE=session", async () => {
			const res = await request(app)
				.get("/api/settings/api-keys/status")
				.set("X-Requested-With", "XMLHttpRequest");

			expect(res.status).toBe(401);
		});

		it("GET /api/settings/api-keys/status should return status boolean and sanitized providers only", async () => {
			const res = await request(app)
				.get("/api/settings/api-keys/status")
				.set("Cookie", `${SESSION_COOKIE}=${sessionA}`)
				.set("X-Requested-With", "XMLHttpRequest");

			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty("hasConfiguredKey");
			expect(typeof res.body.hasConfiguredKey).toBe("boolean");
			expect(res.body).toHaveProperty("configured");
			expect(Array.isArray(res.body.configured.llm)).toBe(true);

			// Ensure zero key exposure
			const json = JSON.stringify(res.body);
			expect(json).not.toContain("sk-");
			expect(json).not.toContain("encrypted");
			expect(json).not.toContain("password");
		});

		it("POST /api/settings/api-keys should save mock test key and return status flag", async () => {
			const res = await request(app)
				.post("/api/settings/api-keys")
				.set("Cookie", `${SESSION_COOKIE}=${sessionA}`)
				.set("X-Requested-With", "XMLHttpRequest")
				.send({
					kind: "llm",
					provider: "openrouter",
					value: "mock_test_key_integration",
					validate: false, // Bypass live network in automated integration test
				});

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("ok", true);
			expect(res.body).toHaveProperty("hasConfiguredKey", true);
		});

		it("POST /api/settings/api-keys/validate should accept mock test keys in test env", async () => {
			const res = await request(app)
				.post("/api/settings/api-keys/validate")
				.set("Cookie", `${SESSION_COOKIE}=${sessionA}`)
				.set("X-Requested-With", "XMLHttpRequest")
				.send({
					kind: "llm",
					provider: "openrouter",
					value: "mock_test_key_valid",
				});

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ ok: true });
		});
	});
});
