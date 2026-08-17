import type { WebSearchResultItem } from "../types/search.types";

export function getHostname(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

export function getFaviconUrl(url: string): string {
	const domain = getHostname(url);
	return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export function getDisplaySourceName(item: WebSearchResultItem): string {
	if (item.source && item.source.trim().length > 0) {
		return item.source.trim();
	}
	const host = getHostname(item.url);
	// Format host nicely (e.g. 'thehindu.com' -> 'The Hindu')
	const parts = host.split(".");
	if (parts.length >= 2) {
		return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
	}
	return host;
}

const STOP_WORDS = new Set([
	"the",
	"and",
	"for",
	"with",
	"this",
	"that",
	"from",
	"have",
	"been",
	"which",
	"also",
	"their",
	"such",
	"than",
	"more",
	"into",
	"over",
	"they",
	"will",
	"when",
	"what",
	"where",
	"about",
	"some",
	"both",
	"then",
	"them",
	"these",
	"those",
	"under",
	"after",
	"other",
]);

export function matchContextSources(
	text: string,
	allSources?: WebSearchResultItem[],
	fallbackIndex = 0,
): WebSearchResultItem[] {
	if (!allSources || allSources.length === 0) return [];
	if (!text || text.trim().length === 0) {
		const fallback = allSources[fallbackIndex % allSources.length];
		return fallback ? [fallback] : [];
	}

	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2 && !STOP_WORDS.has(t));

	if (tokens.length === 0) {
		const fallback = allSources[fallbackIndex % allSources.length];
		return fallback ? [fallback] : [];
	}

	// Score each source based on matching tokens in title, snippet, and source/hostname
	const scored = allSources.map((source) => {
		const srcText =
			`${source.title} ${source.snippet} ${source.source || ""} ${source.url}`.toLowerCase();
		let score = 0;
		for (const token of tokens) {
			if (srcText.includes(token)) {
				// Title matches get extra weight
				if (source.title.toLowerCase().includes(token)) {
					score += 3;
				} else {
					score += 1;
				}
			}
		}
		return { source, score };
	});

	scored.sort((a, b) => b.score - a.score);

	// If the top scored has a positive match score, return top 1 or 2 matching sources
	if (scored[0].score > 0) {
		const best = scored.filter(
			(s) => s.score >= Math.max(2, scored[0].score * 0.6),
		);
		return best.slice(0, 2).map((s) => s.source);
	}

	// Fallback to indexed source so every bullet gets a distributed citation
	const fallback = allSources[fallbackIndex % allSources.length];
	return fallback ? [fallback] : [];
}
