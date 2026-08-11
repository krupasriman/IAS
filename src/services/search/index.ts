import type {
	WebSearchResponse,
	WebSearchResultItem,
} from "../../types/search.types";
import type { SearchSettings } from "../../types/settings.types";

type SearchAttempt = () => Promise<WebSearchResponse>;
type LabeledAttempt = { label: string; run: SearchAttempt };

/**
 * Client-side web search with a resilient fallback chain.
 * Order of attempts:
 *   1. Tavily (AI-optimized) if an API key is configured
 *   2. The explicitly selected provider if it has a usable API key
 *   3. DuckDuckGo (free, no key needed)
 *   4. Wikipedia (free, reliable for factual topics)
 * The first attempt that returns non-empty results wins. If every attempt
 * fails, the empty result (with no web context) is returned so the LLM can
 * still generate a note from its own knowledge.
 */
export async function webSearch(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const provider = settings.provider || "duckduckgo";
	const attempts: LabeledAttempt[] = [];

	if (settings.apiKeys?.tavily) {
		attempts.push({
			label: "Tavily",
			run: () => searchTavily(query, settings),
		});
	}

	if (provider !== "duckduckgo" && provider !== "tavily") {
		const label = provider.charAt(0).toUpperCase() + provider.slice(1);
		attempts.push({
			label,
			run: () => {
				switch (provider) {
					case "serpapi":
						if (!settings.apiKeys?.serpapi) {
							throw new Error("SerpAPI API key not configured");
						}
						return searchSerpApi(query, settings);
					case "brave":
						if (!settings.apiKeys?.brave) {
							throw new Error("Brave API key not configured");
						}
						return searchBrave(query, settings);
					case "langsearch":
						if (!settings.apiKeys?.langsearch) {
							throw new Error("LangSearch API key not configured");
						}
						return searchLangSearch(query, settings);
					default:
						throw new Error(`Unknown search provider: ${provider}`);
				}
			},
		});
	}

	attempts.push({
		label: "DuckDuckGo",
		run: () => searchDuckDuckGo(query, settings),
	});
	attempts.push({
		label: "Wikipedia",
		run: () => searchWikipedia(query, settings),
	});

	if (attempts.length === 0) {
		return {
			query,
			results: [],
			provider,
			timestamp: new Date().toISOString(),
		};
	}

	try {
		const fastestSuccess = await Promise.any(
			attempts.map(async ({ label, run }) => {
				const response = await run();
				if (response.results && response.results.length > 0) {
					return response;
				}
				throw new Error(`${label} returned no results`);
			}),
		);
		return fastestSuccess;
	} catch {
		console.warn(
			"All web search providers failed, proceeding without web context:",
		);
		return {
			query,
			results: [],
			provider,
			timestamp: new Date().toISOString(),
		};
	}
}

async function searchDuckDuckGo(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const maxResults = settings.maxResults || 8;
	const proxyUrl = `/api/search/duckduckgo?q=${encodeURIComponent(query)}`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3500);

	let html = "";
	try {
		const res = await fetch(proxyUrl, {
			signal: controller.signal,
			headers: { Accept: "text/html,application/xhtml+xml" },
		});
		if (res.ok) {
			html = await res.text();
		} else if (res.status === 429) {
			throw new Error(`DuckDuckGo unreachable (rate-limited ${res.status})`);
		} else {
			throw new Error(`DuckDuckGo request failed with status ${res.status}`);
		}
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("DuckDuckGo unreachable (request timed out)");
		}
		throw error;
	} finally {
		clearTimeout(timeout);
	}

	if (!html) {
		throw new Error("DuckDuckGo unreachable (no response body)");
	}

	const results = parseDuckDuckGoResults(html, maxResults);

	if (results.length === 0) {
		throw new Error("DuckDuckGo returned no results");
	}

	return {
		query,
		results,
		provider: "duckduckgo",
		timestamp: new Date().toISOString(),
	};
}

export function parseDuckDuckGoResults(html: string, maxResults: number) {
	const blocks = splitResultBlocks(html);
	const results: WebSearchResultItem[] = [];

	for (const block of blocks.slice(0, maxResults)) {
		const title = extractAnchorText(block, "result__a");
		const snippet = extractAnchorText(block, "result__snippet");
		const url = extractDuckDuckGoUrl(block);

		if (title && url) {
			results.push({ title, url, snippet: snippet || "" });
		}
	}

	return results;
}

function splitResultBlocks(html: string): string[] {
	const re = /<div class="[^"]*\bresult\b[^"]*">/g;
	const blocks: string[] = [];
	let prevEnd: number | undefined;
	for (const match of html.matchAll(re)) {
		if (match.index === undefined) {
			continue;
		}
		if (prevEnd !== undefined) {
			blocks.push(html.slice(prevEnd, match.index));
		}
		prevEnd = match.index + match[0].length;
	}
	if (prevEnd !== undefined) {
		blocks.push(html.slice(prevEnd));
	}
	return blocks;
}

function extractAnchorText(block: string, className: string): string {
	const match = block.match(
		new RegExp(
			`<a[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`,
		),
	);
	return match ? stripHtml(match[1]) : "";
}

function extractDuckDuckGoUrl(block: string): string {
	const titleAnchor = block.match(
		/<a[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']*)["']/,
	);
	if (titleAnchor) {
		return decodeDuckDuckGoUrl(titleAnchor[1]);
	}
	const hrefMatch = block.match(/href=["']([^"']*)["']/);
	return hrefMatch ? decodeDuckDuckGoUrl(hrefMatch[1]) : "";
}

function decodeDuckDuckGoUrl(raw: string): string {
	let url = decodeURIComponent(raw).replace(/^\/\//, "https://");
	if (url.includes("uddg=")) {
		const decoded = url.split("uddg=")[1].split("&")[0];
		url = decodeURIComponent(decoded);
	}
	return url;
}

async function searchWikipedia(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const maxResults = settings.maxResults || 8;
	const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}&origin=*`;

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error("Wikipedia search failed");
	}
	const data = await res.json();

	const results: WebSearchResultItem[] = (
		(data?.query?.search ?? []) as Array<Record<string, unknown>>
	).map((item) => {
		const title =
			typeof item.title === "string" ? item.title : String(item.title ?? "");
		const snippet = typeof item.snippet === "string" ? item.snippet : "";
		return {
			title,
			url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
			snippet: stripHtml(snippet),
			source: "Wikipedia",
		};
	});

	return {
		query,
		results,
		provider: "wikipedia",
		timestamp: new Date().toISOString(),
	};
}

async function searchSerpApi(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const apiKey = settings.apiKeys?.serpapi || "";
	const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("SerpAPI request failed");
	const data = await res.json();
	const results: WebSearchResultItem[] = (
		(data?.organic_results ?? []) as Array<Record<string, unknown>>
	).map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.link === "string" ? r.link : "",
		snippet: typeof r.snippet === "string" ? r.snippet : "",
		source: "Google",
	}));
	return {
		query,
		results,
		provider: "serpapi",
		timestamp: new Date().toISOString(),
	};
}

async function searchBrave(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const apiKey = settings.apiKeys?.brave || "";
	const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${settings.maxResults || 8}`;
	const res = await fetch(url, {
		headers: { "X-Subscription-Token": apiKey },
	});
	if (!res.ok) throw new Error("Brave Search request failed");
	const data = await res.json();
	const results: WebSearchResultItem[] = (
		(data?.web?.results ?? []) as Array<Record<string, unknown>>
	).map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.url === "string" ? r.url : "",
		snippet: typeof r.description === "string" ? r.description : "",
		source: "Brave",
	}));
	return {
		query,
		results,
		provider: "brave",
		timestamp: new Date().toISOString(),
	};
}

async function searchTavily(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const apiKey = settings.apiKeys?.tavily || "";
	const url = "https://api.tavily.com/search";
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			api_key: apiKey,
			query,
			max_results: settings.maxResults || 8,
		}),
	});
	if (!res.ok) throw new Error("Tavily request failed");
	const data = await res.json();
	const results: WebSearchResultItem[] = (
		(data?.results ?? []) as Array<Record<string, unknown>>
	).map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.url === "string" ? r.url : "",
		snippet: typeof r.content === "string" ? r.content : "",
		source: "Tavily",
	}));
	return {
		query,
		results,
		provider: "tavily",
		timestamp: new Date().toISOString(),
	};
}

async function searchLangSearch(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const apiKey = settings.apiKeys?.langsearch || "";
	const url = "https://api.langsearch.com/v1/web-search";
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({ query, count: settings.maxResults || 8 }),
	});
	if (!res.ok) throw new Error("LangSearch request failed");
	const data = await res.json();
	const results: WebSearchResultItem[] = (
		(data?.results ?? data?.web ?? []) as Array<Record<string, unknown>>
	).map((r) => ({
		title:
			typeof r.title === "string"
				? r.title
				: typeof r.name === "string"
					? r.name
					: "",
		url: typeof r.url === "string" ? r.url : "",
		snippet:
			typeof r.snippet === "string"
				? r.snippet
				: typeof r.description === "string"
					? r.description
					: "",
		source: "LangSearch",
	}));
	return {
		query,
		results,
		provider: "langsearch",
		timestamp: new Date().toISOString(),
	};
}

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
