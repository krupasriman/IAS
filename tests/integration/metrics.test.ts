import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../server/app";

describe("Prometheus Metrics Integration", () => {
	it("should expose /metrics endpoint with Prometheus formatted telemetry", async () => {
		const res = await request(app).get("/metrics");

		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("text/plain");
		expect(res.text).toContain("ias_http_requests_total");
		expect(res.text).toContain("ias_llm_tokens_total");
		expect(res.text).toContain("ias_llm_duration_seconds");
		expect(res.text).toContain("process_cpu_user_seconds_total");
	});

	it("should also be accessible via /api/metrics", async () => {
		const res = await request(app).get("/api/metrics");

		expect(res.status).toBe(200);
		expect(res.text).toContain("ias_http_requests_total");
	});
});
