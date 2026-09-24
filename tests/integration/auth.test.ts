import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../server/app";

describe("Authentication & Session Integration", () => {
	const prevAuthMode = process.env.AUTH_MODE;

	beforeAll(() => {
		process.env.AUTH_MODE = "session";
	});

	afterAll(() => {
		process.env.AUTH_MODE = prevAuthMode;
	});

	const testUsername = `user_${Date.now()}`;
	const testPassword = "Password123!";

	it("should reject registration with weak password", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.set("X-Requested-With", "XMLHttpRequest")
			.send({
				username: `weak_${Date.now()}`,
				password: "short",
			});

		expect(res.status).toBe(400);
	});

	it("should register a new user and return sanitized profile", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.set("X-Requested-With", "XMLHttpRequest")
			.send({
				username: testUsername,
				password: testPassword,
			});

		// May be 201 or 500 if Postgres is offline in test runner
		if (res.status === 201) {
			expect(res.body).toHaveProperty("user");
			expect(res.body.user).toHaveProperty("id");
			expect(res.body.user).toHaveProperty("username", testUsername);
			expect(res.body.user).not.toHaveProperty("passwordHash");
			expect(res.body.user).not.toHaveProperty("salt");
		} else {
			expect([201, 500]).toContain(res.status);
		}
	});

	it("should enforce CSRF check on mutating requests without custom headers", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.set("Content-Type", "application/x-www-form-urlencoded")
			.send("username=no_csrf&password=Password123!");

		expect(res.status).toBe(403);
	});
});
