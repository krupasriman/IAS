import { logger } from "../../src/utils/logger";

export interface ValidationResult {
	valid: boolean;
	error?: string;
	statusCode?: number;
}

/**
 * Validates an API key against the upstream provider's live authentication endpoint.
 */
export async function verifyProviderApiKey(
	kind: "llm" | "search",
	provider: string,
	apiKey: string,
): Promise<ValidationResult> {
	const cleanKey = apiKey
		.trim()
		.replace(/^Bearer\s+/i, "")
		.replace(/^["']|["']$/g, "")
		.trim();

	if (!cleanKey) {
		return { valid: false, error: "API key cannot be empty" };
	}

	// Bypass live HTTP checks in unit tests for mock keys
	if (
		process.env.NODE_ENV === "test" &&
		cleanKey.startsWith("mock_test_key_")
	) {
		return { valid: true };
	}

	try {
		let testUrl = "";
		const headers: Record<string, string> = {
			"User-Agent": "IAS-Study-Notes-BYOK-Validator/1.0",
		};

		if (kind === "llm") {
			switch (provider) {
				case "openrouter":
					testUrl = "https://openrouter.ai/api/v1/auth/key";
					headers.Authorization = `Bearer ${cleanKey}`;
					break;
				case "groq":
					testUrl = "https://api.groq.com/openai/v1/models";
					headers.Authorization = `Bearer ${cleanKey}`;
					break;
				case "generalcompute":
					testUrl = "https://api.generalcompute.com/v1/models";
					headers.Authorization = `Bearer ${cleanKey}`;
					break;
				default:
					testUrl = "https://api.openai.com/v1/models";
					headers.Authorization = `Bearer ${cleanKey}`;
					break;
			}
		} else if (kind === "search") {
			switch (provider) {
				case "duckduckgo":
					return { valid: true };
				case "brave":
					testUrl =
						"https://api.search.brave.com/res/v1/web/search?q=test&count=1";
					headers["X-Subscription-Token"] = cleanKey;
					break;
				case "serpapi":
					testUrl = `https://serpapi.com/account?api_key=${cleanKey}`;
					break;
				case "tavily":
					return { valid: cleanKey.length >= 10 };
				default:
					return { valid: true };
			}
		}

		if (!testUrl) {
			return { valid: true };
		}

		const response = await fetch(testUrl, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(6000),
		});

		if (response.ok) {
			return { valid: true, statusCode: response.status };
		}

		if (response.status === 401 || response.status === 403) {
			return {
				valid: false,
				statusCode: response.status,
				error: `Provider rejected API key (Unauthorized ${response.status}). Please check your key credentials.`,
			};
		}

		if (response.status === 429) {
			// Rate limited, but key was authenticated
			return {
				valid: true,
				statusCode: response.status,
				error: "Key authenticated, but provider currently rate-limited (429).",
			};
		}

		return {
			valid: false,
			statusCode: response.status,
			error: `Validation failed with status ${response.status}`,
		};
	} catch (err: unknown) {
		logger.warn(
			{ err, provider, kind },
			"Error during key verification with upstream provider",
		);
		const msg = err instanceof Error ? err.message : String(err);
		return {
			valid: false,
			error: `Network timeout or unreachable provider endpoint: ${msg}`,
		};
	}
}
