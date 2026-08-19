export interface KeyValidationResult {
	isValid: boolean;
	error?: string;
}

export function getApiKeyPlaceholder(provider: string): string {
	switch (provider) {
		case "openrouter":
			return "sk-or-v1-...";
		case "groq":
			return "gsk_...";
		case "generalcompute":
			return "gc_...";
		case "tavily":
			return "tvly-...";
		case "brave":
			return "BSA...";
		case "serpapi":
			return "64-character hex key...";
		default:
			return "Enter API key...";
	}
}

export function validateApiKeyFormat(
	provider: string,
	key: string,
): KeyValidationResult {
	const trimmed = key.trim();
	if (!trimmed) {
		return { isValid: true };
	}

	// Catch literal placeholders
	if (
		trimmed === "sk-..." ||
		trimmed === "gsk_..." ||
		trimmed === "gc_..." ||
		trimmed === "tvly-..." ||
		trimmed === "BSA..."
	) {
		return {
			isValid: false,
			error: "Please replace the placeholder with your actual API key.",
		};
	}

	switch (provider) {
		case "openrouter": {
			if (trimmed.startsWith("gsk_")) {
				return {
					isValid: false,
					error:
						"This is a Groq key (starts with gsk_). OpenRouter keys start with sk-or-v1-.",
				};
			}
			if (trimmed.startsWith("tvly-") || trimmed.startsWith("BSA")) {
				return {
					isValid: false,
					error: "This is a search provider key, not an OpenRouter key.",
				};
			}
			if (!trimmed.startsWith("sk-or-v1-") && !trimmed.startsWith("sk-or-")) {
				return {
					isValid: false,
					error:
						"Invalid OpenRouter key format. Keys must start with 'sk-or-v1-'.",
				};
			}
			if (trimmed.length < 25) {
				return {
					isValid: false,
					error: "OpenRouter key is too short. Please enter the complete key.",
				};
			}
			return { isValid: true };
		}

		case "groq": {
			if (trimmed.startsWith("sk-or-")) {
				return {
					isValid: false,
					error: "This is an OpenRouter key. Groq keys must start with 'gsk_'.",
				};
			}
			if (trimmed.startsWith("tvly-") || trimmed.startsWith("BSA")) {
				return {
					isValid: false,
					error: "This is a search provider key, not a Groq key.",
				};
			}
			if (!trimmed.startsWith("gsk_")) {
				return {
					isValid: false,
					error: "Invalid Groq key format. Keys must start with 'gsk_'.",
				};
			}
			if (trimmed.length < 20) {
				return {
					isValid: false,
					error: "Groq key is too short. Please enter the complete key.",
				};
			}
			return { isValid: true };
		}

		case "generalcompute": {
			if (trimmed.startsWith("gsk_") || trimmed.startsWith("sk-or-")) {
				return {
					isValid: false,
					error: "Please enter a valid General Compute key.",
				};
			}
			if (trimmed.length < 5) {
				return {
					isValid: false,
					error: "General Compute key is too short.",
				};
			}
			return { isValid: true };
		}

		case "tavily": {
			if (!trimmed.startsWith("tvly-")) {
				return {
					isValid: false,
					error: "Invalid Tavily key format. Keys must start with 'tvly-'.",
				};
			}
			return { isValid: true };
		}

		case "serpapi": {
			if (trimmed.length < 20) {
				return {
					isValid: false,
					error: "SerpAPI key is too short.",
				};
			}
			return { isValid: true };
		}

		case "brave": {
			if (trimmed.length < 15) {
				return {
					isValid: false,
					error: "Brave Search API key is too short.",
				};
			}
			return { isValid: true };
		}

		default:
			return { isValid: true };
	}
}
