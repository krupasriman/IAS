import { expect, test } from "@playwright/test";

test.describe("Security Check 2: Network Traffic & API Over-fetching", () => {
	const SENSITIVE_FIELD_PATTERNS = [
		/passwordHash/i,
		/password_hash/i,
		/salt/i,
		/raw_token/i,
		/secretKey/i,
		/encryption_key/i,
		/privateKey/i,
		/db_url/i,
		/stackTrace/i,
	];

	test("should not return sensitive backend attributes or raw secrets in API responses", async ({
		page,
	}) => {
		const interceptedViolations: string[] = [];

		page.on("response", async (response) => {
			const url = response.url();
			if (
				url.includes("/api/") &&
				response.status() === 200 &&
				response.headers()["content-type"]?.includes("application/json")
			) {
				try {
					const json = await response.json();
					const jsonString = JSON.stringify(json);

					for (const pattern of SENSITIVE_FIELD_PATTERNS) {
						if (pattern.test(jsonString)) {
							interceptedViolations.push(
								`Endpoint ${url} leaked sensitive field matching pattern ${pattern.toString()}: ${jsonString.slice(0, 150)}...`,
							);
						}
					}

					if (
						json.stack ||
						(json.error && /at\s+.*\.(ts|js):/i.test(json.error))
					) {
						interceptedViolations.push(
							`Endpoint ${url} leaked internal stack trace in error response: ${jsonString}`,
						);
					}
				} catch {
					// Non-JSON response
				}
			}
		});

		await page.goto("/");
		await page.goto("/topics");
		await page.goto("/settings");

		expect(
			interceptedViolations,
			`Sensitive fields exposed over API:\n${interceptedViolations.join("\n")}`,
		).toEqual([]);
	});

	test("should sanitize /api/settings/api-keys and never expose cleartext keys", async ({
		request,
	}) => {
		const response = await request.get("/api/settings/api-keys");
		if (response.status() === 200) {
			const data = await response.json();
			expect(data).toHaveProperty("configured");

			if (data.configured) {
				for (const kind of Object.keys(data.configured)) {
					const providerList = data.configured[kind];
					expect(Array.isArray(providerList)).toBeTruthy();
					for (const item of providerList) {
						expect(typeof item).toBe("string");
						expect(item).not.toMatch(
							/^(sk-|gsk_|gc_|AIzaSy|[A-Za-z0-9_-]{32,})/,
						);
					}
				}
			}
		}
	});
});
