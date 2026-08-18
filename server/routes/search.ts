import { Router } from "express";
import { logger } from "../../src/utils/logger";
import { sendError } from "../utils/errors";

const router = Router();

interface DdgCacheEntry {
	html: string;
	expiresAt: number;
}

// Short-lived in-memory cache to blunt DuckDuckGo rate limiting and speed up
// repeated searches. Capped so repeated distinct queries cannot grow unbounded.
const DDG_CACHE_TTL_MS = 5 * 60 * 1000;
const DDG_CACHE_MAX_ENTRIES = 200;
const ddgCache = new Map<string, DdgCacheEntry>();

const DDG_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

// DuckDuckGo sometimes serves a captcha/anomaly interstitial instead of results
// (typically when the host IP is rate-limited). We detect this so we can return a
// 403 instead of feeding the client an unparseable page that always yields "no
// results".
const DDG_BLOCKED_MARKERS = [
	"are you a robot",
	"captcha",
	"anomaly",
	"check your proxy",
	"privacy warning",
	"please verify you are a human",
];

function isDdgBlocked(html: string): boolean {
	const sample = html.slice(0, 8192).toLowerCase();
	return DDG_BLOCKED_MARKERS.some((marker) => sample.includes(marker));
}

router.get("/search/duckduckgo", async (req, res) => {
	const query = req.query.q as string;
	if (!query) {
		sendError(res, 400, 'Query parameter "q" is required');
		return;
	}

	const cacheKey = `ddg:${query.toLowerCase()}`;
	const cached = ddgCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		logger.debug({ query, cached: true }, "DuckDuckGo cache hit");
		res.type("text/html").send(cached.html);
		return;
	}

	const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&ia=web`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10000);

	let response: Response;
	try {
		response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": DDG_USER_AGENT,
			},
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error && error.name === "AbortError"
				? "DuckDuckGo request timed out"
				: "Failed to fetch from DuckDuckGo";
		logger.error({ err: message, query }, "Failed to fetch from DuckDuckGo");
		sendError(res, 502, message);
		return;
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		logger.warn(
			{ status: response.status, query },
			"DuckDuckGo returned non-OK status",
		);
		if (response.status === 429 || response.status === 403) {
			sendError(
				res,
				response.status,
				`DuckDuckGo rate-limited (${response.status})`,
			);
		} else {
			sendError(res, 502, `DuckDuckGo returned ${response.status}`);
		}
		return;
	}

	const html = await response.text();

	if (isDdgBlocked(html)) {
		logger.warn({ query }, "DuckDuckGo blocked request (anomaly/captcha)");
		sendError(res, 403, "DuckDuckGo blocked the request");
		return;
	}

	if (ddgCache.size >= DDG_CACHE_MAX_ENTRIES) {
		const oldestKey = ddgCache.keys().next().value;
		if (oldestKey !== undefined) {
			ddgCache.delete(oldestKey);
		}
	}
	ddgCache.set(cacheKey, { html, expiresAt: Date.now() + DDG_CACHE_TTL_MS });

	res.type("text/html").send(html);
});

export default router;
