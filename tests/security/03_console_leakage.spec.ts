import { expect, test } from "@playwright/test";

test.describe("Security Check 3: Console Output & State Leaks", () => {
	const SENSITIVE_CONSOLE_PATTERNS = [
		/api[_-]?key/i,
		/bearer\s+[a-z0-9]/i,
		/sk-[a-zA-Z0-9]{20,}/,
		/password/i,
		/session_token/i,
		/BEGIN PRIVATE KEY/,
	];

	test("should not log sensitive state objects, API keys, or raw backend tokens to console", async ({
		page,
	}) => {
		const consoleErrors: string[] = [];
		const consoleWarnings: string[] = [];
		const consoleLogs: string[] = [];

		page.on("console", (msg) => {
			const text = msg.text();
			const type = msg.type();

			for (const pattern of SENSITIVE_CONSOLE_PATTERNS) {
				if (pattern.test(text)) {
					const violation = `[Console ${type.toUpperCase()}] Pattern ${pattern.toString()} matched: "${text.slice(0, 120)}"`;
					if (type === "error") consoleErrors.push(violation);
					else if (type === "warning") consoleWarnings.push(violation);
					else consoleLogs.push(violation);
				}
			}
		});

		await page.goto("/");
		await page.goto("/settings");

		const apiKeyInput = page.locator("#llm-api-key");
		if (await apiKeyInput.isVisible()) {
			await apiKeyInput.fill("sk-test-mock-automation-key-sample-12345");
		}

		await page.goto("/topics");

		const allViolations = [
			...consoleErrors,
			...consoleWarnings,
			...consoleLogs,
		];
		expect(
			allViolations,
			`Sensitive data logged to Developer Console:\n${allViolations.join("\n")}`,
		).toEqual([]);
	});
});
