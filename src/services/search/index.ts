import type {
	WebSearchResponse,
	WebSearchResultItem,
} from "../../types/search.types";
import type { SearchSettings } from "../../types/settings.types";

type SearchAttempt = () => Promise<WebSearchResponse>;
type LabeledAttempt = { label: string; run: SearchAttempt };

/**
 * Web search client:
 * 1. Calls the secure server-side search broker (/api/search) with server-managed secrets.
 * 2. Falls back to DuckDuckGo proxy and Wikipedia if the server broker is unreachable.
 */
export async function webSearch(
	query: string,
	settings: SearchSettings,
): Promise<WebSearchResponse> {
	const provider = settings.provider || "duckduckgo";
	const maxResults = settings.maxResults || 8;

	// 1. Primary: Server-side search broker with zero client-side secret leakage
	try {
		const res = await fetch("/api/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Requested-With": "XMLHttpRequest",
			},
			body: JSON.stringify({ query, provider, maxResults }),
		});
		if (res.ok) {
			const data = (await res.json()) as WebSearchResponse;
			if (data?.results && data.results.length > 0) {
				return data;
			}
		}
	} catch {
		// Server broker offline or not responding; fallback to direct channels
	}

	// 2. Direct fallback chain (DuckDuckGo -> Wikipedia)
	const attempts: LabeledAttempt[] = [
		{
			label: "DuckDuckGo",
			run: () => searchDuckDuckGo(query, settings),
		},
		{
			label: "Wikipedia",
			run: () => searchWikipedia(query, settings),
		},
	];

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
	const data = (await res.json()) as {
		query?: { search?: Array<{ title?: string; snippet?: string }> };
	};

	const results: WebSearchResultItem[] = (data?.query?.search ?? []).map(
		(item) => {
			const title =
				typeof item.title === "string" ? item.title : String(item.title ?? "");
			const snippet = typeof item.snippet === "string" ? item.snippet : "";
			return {
				title,
				url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
				snippet: stripHtml(snippet),
				source: "Wikipedia",
			};
		},
	);

	return {
		query,
		results,
		provider: "wikipedia",
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
