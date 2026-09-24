import { expect, test } from "@playwright/test";

test.describe("Security Check 1: DOM & Script Bundle Secret Leakage", () => {
	const SECRET_PATTERNS = [
		{ name: "Google API Key", regex: /AIzaSy[A-Za-z0-9_-]{33}/g },
		{ name: "OpenAI Secret Key", regex: /sk-[A-Za-z0-9]{32,}/g },
		{ name: "Live Secret Key", regex: /sk_live_[0-9a-zA-Z]{24}/g },
		{ name: "GeneralCompute Token", regex: /gc_[A-Za-z0-9_-]{20,}/g },
		{ name: "Groq API Key", regex: /gsk_[A-Za-z0-9]{30,}/g },
		{
			name: "Hardcoded Bearer Token",
			regex: /["']Bearer\s+[A-Za-z0-9\-_.]{20,}["']/gi,
		},
		{
			name: "Exposed Private Key",
			regex: /-----BEGIN PRIVATE KEY-----/g,
		},
	];

	test("should not expose hardcoded API keys or secrets in loaded scripts", async ({
		page,
	}) => {
		const fetchedScripts: { url: string; content: string }[] = [];

		page.on("response", async (response) => {
			const url = response.url();
			const contentType = response.headers()["content-type"] || "";
			if (
				(contentType.includes("javascript") || url.endsWith(".js")) &&
				!url.includes("node_modules")
			) {
				try {
					const text = await response.text();
					fetchedScripts.push({ url, content: text });
				} catch {
					// Ignore aborts
				}
			}
		});

		await page.goto("/", { waitUntil: "networkidle" });

		const violations: string[] = [];
		for (const script of fetchedScripts) {
			for (const pattern of SECRET_PATTERNS) {
				const matches = script.content.match(pattern.regex);
				if (matches) {
					const validMatches = matches.filter(
						(m) =>
							!m.includes("sk-...") &&
							!m.includes("gsk_...") &&
							!m.includes("placeholder"),
					);
					if (validMatches.length > 0) {
						violations.push(
							`[${pattern.name}] found in script ${script.url}: ${validMatches.join(", ")}`,
						);
					}
				}
			}
		}

		const domContent = await page.content();
		for (const pattern of SECRET_PATTERNS) {
			const matches = domContent.match(pattern.regex);
			if (matches) {
				const validMatches = matches.filter(
					(m) => !m.includes("sk-...") && !m.includes("placeholder"),
				);
				if (validMatches.length > 0) {
					violations.push(
						`[${pattern.name}] found in raw DOM: ${validMatches.join(", ")}`,
					);
				}
			}
		}

		expect(
			violations,
			`Detected secret leakage in client assets:\n${violations.join("\n")}`,
		).toEqual([]);
	});

	test("should not serve accessible production source map (.map) files", async ({
		page,
		request,
	}) => {
		const scriptUrls: string[] = [];

		page.on("response", (response) => {
			const url = response.url();
			if (url.endsWith(".js")) {
				scriptUrls.push(url);
			}
		});

		await page.goto("/", { waitUntil: "networkidle" });

		const accessibleMaps: string[] = [];

		for (const scriptUrl of scriptUrls) {
			const mapUrl = `${scriptUrl}.map`;
			const res = await request.get(mapUrl);

			if (res.status() === 200) {
				const contentType = res.headers()["content-type"] || "";
				if (
					contentType.includes("json") ||
					contentType.includes("octet-stream")
				) {
					const text = await res.text();
					if (text.includes('"version":') && text.includes('"sources":')) {
						accessibleMaps.push(mapUrl);
					}
				}
			}
		}

		expect(
			accessibleMaps,
			`Production source maps are publicly accessible:\n${accessibleMaps.join("\n")}`,
		).toEqual([]);
	});

	test("should enforce write-only masked API keys and forbid plaintext toggle in UI/DOM", async ({
		page,
	}) => {
		await page.goto("/settings", { waitUntil: "networkidle" });

		const apiKeyInput = page.locator("#llm-api-key");
		await expect(apiKeyInput).toBeVisible();

		// Verify strictly password masked
		const inputType = await apiKeyInput.getAttribute("type");
		expect(inputType).toBe("password");

		// Verify no 'see' toggle button exists anywhere in the API key container
		const seeButtons = page.locator(
			'button:has(svg.lucide-eye), button:has(svg.lucide-eye-off), button[aria-label*="show key" i], button[aria-label*="view key" i]',
		);
		await expect(seeButtons).toHaveCount(0);

		// Enter dummy test key
		const testKey = "gc_never_leak_in_devtools_12345678901234567890";
		await apiKeyInput.fill(testKey);

		// Save settings
		const saveButton = page.locator('button:has-text("Save")').first();
		if (await saveButton.isEnabled()) {
			await saveButton.click();
			await page.waitForTimeout(600);
		}

		// Verify DOM value never exposes the cleartext key after saving (masked bullets)
		const domValue = await apiKeyInput.inputValue();
		expect(domValue).not.toContain(testKey);
		expect(domValue).toMatch(/^$|^[•*]+$/);

		// Verify localStorage never contains the cleartext key
		const storageData = await page.evaluate(() =>
			JSON.stringify(window.localStorage),
		);
		expect(storageData).not.toContain(testKey);
	});

	test("should prompt for API key when switching to an unconfigured provider", async ({
		page,
	}) => {
		await page.goto("/settings", { waitUntil: "networkidle" });

		const providerSelect = page.locator("#llm-provider");
		const apiKeyInput = page.locator("#llm-api-key");

		// Switch to Groq
		await providerSelect.selectOption("groq");
		await expect(page.getByText(/Key Required/i).first()).toBeVisible();
		await expect(apiKeyInput).toHaveAttribute(
			"placeholder",
			/Enter Groq API key|gsk_/,
		);
		await expect(
			page.locator('button:has-text("Save Key")').first(),
		).toBeVisible();

		// Switch to OpenRouter
		await providerSelect.selectOption("openrouter");
		await expect(page.getByText(/Key Required/i).first()).toBeVisible();
		await expect(apiKeyInput).toHaveAttribute(
			"placeholder",
			/Enter OpenRouter API key|sk-or-v1-/,
		);
		await expect(
			page.locator('button:has-text("Save Key")').first(),
		).toBeVisible();
	});
});
