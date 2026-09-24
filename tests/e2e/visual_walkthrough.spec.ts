import { test } from "@playwright/test";

test.describe("UPSC Notes Platform — Visual Feature Walkthrough", () => {
	test("Headed Walkthrough: Generator, Virtualized Topics, UPSC 5-Part Note & Key Vault", async ({
		page,
	}) => {
		// Set high timeout so the user can watch the entire guided walkthrough
		test.setTimeout(120000);

		// Comfortable, high-DPI desktop viewport
		await page.setViewportSize({ width: 1366, height: 860 });

		console.log("\n=======================================================");
		console.log(" [STEP 1/5] Launching Home Generator View");
		console.log("=======================================================");
		await page.goto("http://localhost:5173/");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		// Demonstrate interactive prompt typing in the floating QueryBar
		const queryInput = page.locator('input[type="text"]').first();
		if (await queryInput.isVisible()) {
			await queryInput.click();
			await page.waitForTimeout(500);
			await queryInput.fill(
				"Uniform Civil Code: Constitutional Morality vs Cultural Pluralism",
			);
			await page.waitForTimeout(2000);
		}

		console.log("\n=======================================================");
		console.log(
			" [STEP 2/5] Navigating to All Topics Library (Virtualized List)",
		);
		console.log("=======================================================");
		// Navigate to All Topics
		await page.goto("http://localhost:5173/topics");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		// Showcase the virtualized topic rows and category chips
		console.log(" Demonstrating smooth virtualized scroll...");
		await page.mouse.wheel(0, 300);
		await page.waitForTimeout(1200);
		await page.mouse.wheel(0, 400);
		await page.waitForTimeout(1200);
		await page.mouse.wheel(0, -700);
		await page.waitForTimeout(1500);

		// Filter topics by category
		const categoryChip = page.locator("button", { hasText: "Society" }).first();
		if (await categoryChip.isVisible()) {
			console.log(" Filtering topics by 'Society' category...");
			await categoryChip.click();
			await page.waitForTimeout(2000);
		}

		console.log("\n=======================================================");
		console.log(" [STEP 3/5] Opening UPSC 5-Part Note View");
		console.log("=======================================================");
		// Click on a topic row or navigate directly to the detailed topic view
		const topicRow = page.locator(".topic-row").first();
		if (await topicRow.isVisible()) {
			await topicRow.click();
		} else {
			await page.goto("http://localhost:5173/topic/honour-killing");
		}
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2500);

		// Showcase the 5-Part UPSC layout: Context, Quote, Pros/Cons, Way Forward, Conclusion Pivot
		console.log(" Inspecting Section 1: Meaning & Constitutional Quote...");
		await page.mouse.wheel(0, 300);
		await page.waitForTimeout(2000);

		console.log(" Inspecting Section 2: Balanced Dimensions (Pros & Cons)...");
		await page.mouse.wheel(0, 450);
		await page.waitForTimeout(2500);

		console.log(" Inspecting Section 3: Actionable Policy Way Forward...");
		await page.mouse.wheel(0, 450);
		await page.waitForTimeout(2500);

		console.log(
			" Inspecting Section 4: Risk vs Resolution Conclusion Pivot...",
		);
		await page.mouse.wheel(0, 400);
		await page.waitForTimeout(3000);

		// Scroll smoothly back to top
		await page.mouse.wheel(0, -1600);
		await page.waitForTimeout(1500);

		console.log("\n=======================================================");
		console.log(" [STEP 4/5] Navigating to Settings & AES-256 Key Vault");
		console.log("=======================================================");
		await page.goto("http://localhost:5173/settings");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2500);

		// Scroll to inspect LLM provider configurations & encrypted vault indicators
		await page.mouse.wheel(0, 350);
		await page.waitForTimeout(2000);
		await page.mouse.wheel(0, -350);
		await page.waitForTimeout(1500);

		console.log("\n=======================================================");
		console.log(" [STEP 5/5] Demonstrating Theme & Workspace Switching");
		console.log("=======================================================");
		// Toggle theme button in sidebar if visible
		const themeToggle = page
			.locator('button[aria-label*="theme" i], button[title*="theme" i]')
			.first();
		if (await themeToggle.isVisible()) {
			console.log(" Toggling Dark / Light theme...");
			await themeToggle.click();
			await page.waitForTimeout(2000);
			await themeToggle.click();
			await page.waitForTimeout(1500);
		}

		// Return to Home
		await page.goto("http://localhost:5173/");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2500);

		console.log("=======================================================");
		console.log(" Guided Visual Walkthrough Finished Successfully!");
		console.log("=======================================================\n");
	});
});
