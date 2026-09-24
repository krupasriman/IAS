import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../server/app";
import {
	createSession,
	createUser,
	SESSION_COOKIE,
} from "../../server/services/auth";

describe("Topics API & Correlation ID Integration", () => {
	let authCookie = "";

	beforeAll(async () => {
		try {
			const u = await createUser(
				`topics_test_${Date.now()}@example.com`,
				"Password123!",
			);
			const sessionId = await createSession(u);
			authCookie = `${SESSION_COOKIE}=${sessionId}`;
		} catch {
			// In local auth mode or if user already created
		}
	});

	it("should attach X-Correlation-ID header on all responses", async () => {
		const res = await request(app).get("/api/health");

		expect(res.status).toBe(200);
		expect(res.headers["x-correlation-id"]).toBeDefined();
		expect(typeof res.headers["x-correlation-id"]).toBe("string");
		expect(res.headers["x-correlation-id"].length).toBeGreaterThan(0);
	});

	it("should echo back client provided X-Correlation-ID", async () => {
		const clientCorrId = "custom-trace-uuid-12345";
		const res = await request(app)
			.get("/api/health")
			.set("X-Correlation-ID", clientCorrId);

		expect(res.status).toBe(200);
		expect(res.headers["x-correlation-id"]).toBe(clientCorrId);
	});

	it("should return topic list or seed fallback", async () => {
		const req = request(app).get("/api/topics");
		if (authCookie) req.set("Cookie", authCookie);
		const res = await req;

		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("topics");
		expect(Array.isArray(res.body.topics)).toBe(true);
	});

	it("should return paginated envelope when limit query param is passed", async () => {
		const req = request(app).get("/api/topics?limit=2");
		if (authCookie) req.set("Cookie", authCookie);
		const res = await req;

		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty("items");
		expect(res.body).toHaveProperty("hasMore");
		expect(res.body).toHaveProperty("totalCount");
		expect(Array.isArray(res.body.items)).toBe(true);
		expect(res.body.items.length).toBeLessThanOrEqual(2);
	});

	it("should return 404 when querying an unknown or unauthorized topic ID", async () => {
		const req = request(app).get("/api/topics/unauthorized_topic_99999");
		if (authCookie) req.set("Cookie", authCookie);
		const res = await req;
		expect(res.status).toBe(404);
	});

	it("should reject deletion of unauthorized or nonexistent topic ID", async () => {
		const req = request(app)
			.delete("/api/topics/unauthorized_topic_99999")
			.set("X-Requested-With", "XMLHttpRequest");
		if (authCookie) req.set("Cookie", authCookie);
		const res = await req;
		expect(res.status).toBe(404);
	});

	it("should reject off-topic non-study queries with 400 on /api/generate", async () => {
		const req = request(app)
			.post("/api/generate")
			.set("X-Requested-With", "XMLHttpRequest");
		if (authCookie) req.set("Cookie", authCookie);
		const res = await req.send({
			topic: "what is my name",
			provider: "groq",
			apiKey: "gsk_dummy_test_key_1234567890",
			model: "llama-3.3-70b-versatile",
		});

		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/UPSC \/ IAS/i);
	});
});
