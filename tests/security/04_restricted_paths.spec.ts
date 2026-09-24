import { expect, test } from "@playwright/test";

test.describe("Security Check 4: Sensitive Directory & File Probing", () => {
	const RESTRICTED_PATHS = [
		"/.env",
		"/.env.local",
		"/.env.production",
		"/.git/config",
		"/.git/HEAD",
		"/backup.zip",
		"/server-status",
		"/server-info",
		"/data/ias.db",
		"/data/.encryption.key",
	];

	for (const path of RESTRICTED_PATHS) {
		test(`probe path: ${path} should be blocked or return non-sensitive response`, async ({
			request,
		}) => {
			const res = await request.get(path);
			const status = res.status();
			const contentType = res.headers()["content-type"] || "";
			const body = await res.text();

			if (status === 200) {
				expect(contentType).not.toContain("application/zip");
				expect(contentType).not.toContain("application/x-sqlite3");
				expect(contentType).not.toContain("application/octet-stream");

				expect(body).not.toContain("ENCRYPTION_KEY=");
				expect(body).not.toContain("DATABASE_URL=");
				expect(body).not.toContain("[core]");
				expect(body).not.toContain("repositoryformatversion");
				expect(body).not.toContain("SQLite format 3");
			} else {
				expect([401, 403, 404]).toContain(status);
			}
		});
	}
});
