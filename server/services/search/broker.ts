import type {
	WebSearchResponse,
	WebSearchResultItem,
} from "../../../src/types/search.types";
import type { SearchProvider } from "../../../src/types/settings.types";
import { logger } from "../../../src/utils/logger";
import { getApiKey } from "../apiKeys";

const DDG_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

async function searchWikipedia(
	query: string,
	maxResults = 8,
): Promise<WebSearchResponse> {
	const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}&origin=*`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("Wikipedia search failed");
	const data = (await res.json()) as {
		query?: { search?: Array<{ title?: string; snippet?: string }> };
	};

	const results: WebSearchResultItem[] = (data?.query?.search ?? []).map(
		(item) => ({
			title: item.title || "",
			url: `https://en.wikipedia.org/wiki/${encodeURIComponent((item.title || "").replace(/ /g, "_"))}`,
			snippet: stripHtml(item.snippet || ""),
			source: "Wikipedia",
		}),
	);

	return {
		query,
		results,
		provider: "wikipedia",
		timestamp: new Date().toISOString(),
	};
}

async function searchTavily(
	query: string,
	apiKey: string,
	maxResults = 8,
): Promise<WebSearchResponse> {
	const res = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			api_key: apiKey,
			query,
			max_results: maxResults,
		}),
	});
	if (!res.ok) throw new Error(`Tavily request failed: ${res.status}`);
	const data = (await res.json()) as {
		results?: Array<{ title?: string; url?: string; content?: string }>;
	};

	const results: WebSearchResultItem[] = (data.results ?? []).map((r) => ({
		title: r.title || "",
		url: r.url || "",
		snippet: r.content || "",
	}));

	return {
		query,
		results,
		provider: "tavily",
		timestamp: new Date().toISOString(),
	};
}

async function searchBrave(
	query: string,
	apiKey: string,
	maxResults = 8,
): Promise<WebSearchResponse> {
	const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
	const res = await fetch(url, {
		headers: { "X-Subscription-Token": apiKey },
	});
	if (!res.ok) throw new Error(`Brave Search failed: ${res.status}`);
	const data = (await res.json()) as {
		web?: {
			results?: Array<{ title?: string; url?: string; description?: string }>;
		};
	};

	const results: WebSearchResultItem[] = (data.web?.results ?? []).map((r) => ({
		title: r.title || "",
		url: r.url || "",
		snippet: r.description || "",
	}));

	return {
		query,
		results,
		provider: "brave",
		timestamp: new Date().toISOString(),
	};
}

async function searchDuckDuckGo(
	query: string,
	maxResults = 8,
): Promise<WebSearchResponse> {
	const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&ia=web`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 6000);

	let html = "";
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": DDG_USER_AGENT,
			},
		});
		if (res.ok) {
			html = await res.text();
		}
	} finally {
		clearTimeout(timeout);
	}

	if (!html) {
		throw new Error("DuckDuckGo returned empty response");
	}

	// Simple parser
	const regex =
		/<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/g;
	const titleRegex =
		/<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/g;

	const titles: { url: string; title: string }[] = [];
	for (const match of html.matchAll(titleRegex)) {
		let rawUrl = match[1];
		if (rawUrl.includes("uddg=")) {
			rawUrl = decodeURIComponent(rawUrl.split("uddg=")[1].split("&")[0]);
		}
		titles.push({ url: rawUrl, title: stripHtml(match[2]) });
	}

	const snippets: string[] = [];
	for (const match of html.matchAll(regex)) {
		snippets.push(stripHtml(match[1]));
	}

	const results: WebSearchResultItem[] = [];
	for (let i = 0; i < Math.min(titles.length, maxResults); i++) {
		if (titles[i].title && titles[i].url) {
			results.push({
				title: titles[i].title,
				url: titles[i].url,
				snippet: snippets[i] || "",
			});
		}
	}

	if (results.length === 0) {
		throw new Error("DuckDuckGo returned 0 parsed results");
	}

	return {
		query,
		results,
		provider: "duckduckgo",
		timestamp: new Date().toISOString(),
	};
}

export function anchorSearchQuery(query: string): string {
	const trimmed = query.trim();
	const lower = trimmed.toLowerCase();
	if (
		lower.includes("upsc") ||
		lower.includes("ias") ||
		lower.includes("pib") ||
		lower.includes("mains") ||
		lower.includes("public policy") ||
		lower.includes("governance")
	) {
		return trimmed;
	}
	return `${trimmed} UPSC civil services policy`;
}

export async function executeServerSearch(
	query: string,
	preferredProvider: SearchProvider = "duckduckgo",
	userId = "usr_local_admin_0000000000",
	maxResults = 8,
): Promise<WebSearchResponse> {
	const webQuery = anchorSearchQuery(query);

	// Fallback sequence
	const attempts: Array<{
		name: string;
		run: () => Promise<WebSearchResponse>;
	}> = [];

	// 1. Tavily if key configured
	const tavilyKey =
		(await getApiKey(userId, "search", "tavily")) || process.env.TAVILY_API_KEY;
	if (tavilyKey) {
		attempts.push({
			name: "Tavily",
			run: () => searchTavily(webQuery, tavilyKey, maxResults),
		});
	}

	// 2. Preferred provider if not DDG/tavily
	if (preferredProvider === "brave") {
		const braveKey =
			(await getApiKey(userId, "search", "brave")) || process.env.BRAVE_API_KEY;
		if (braveKey) {
			attempts.push({
				name: "Brave",
				run: () => searchBrave(webQuery, braveKey, maxResults),
			});
		}
	}

	// 3. DuckDuckGo (free)
	attempts.push({
		name: "DuckDuckGo",
		run: () => searchDuckDuckGo(webQuery, maxResults),
	});

	// 4. Wikipedia (free, highly reliable - searches exact conceptual title)
	attempts.push({
		name: "Wikipedia",
		run: () => searchWikipedia(query, maxResults),
	});

	for (const attempt of attempts) {
		try {
			const res = await attempt.run();
			if (res.results && res.results.length > 0) {
				logger.info(
					{ query, provider: res.provider, count: res.results.length },
					"Server-side web search succeeded",
				);
				return res;
			}
		} catch (err) {
			logger.warn(
				{
					provider: attempt.name,
					err: err instanceof Error ? err.message : String(err),
				},
				"Search provider attempt failed, trying next fallback",
			);
		}
	}

	return {
		query,
		results: [],
		provider: "none",
		timestamp: new Date().toISOString(),
	};
}
