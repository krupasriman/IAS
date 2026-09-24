import { Router } from "express";
import { z } from "zod";
import { logger } from "../../src/utils/logger";
import { validateTopicRelevance } from "../../src/utils/topicGuardrail";
import { executeServerSearch } from "../services/search/broker";
import { sendError } from "../utils/errors";

const router = Router();

interface DdgCacheEntry {
	html: string;
	expiresAt: number;
}

const DDG_CACHE_TTL_MS = 5 * 60 * 1000;
const DDG_CACHE_MAX_ENTRIES = 200;
const ddgCache = new Map<string, DdgCacheEntry>();

const DDG_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

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

const SearchRequestSchema = z.object({
	query: z.string().min(1).max(300),
	provider: z
		.enum(["duckduckgo", "serpapi", "brave", "tavily", "langsearch"])
		.optional(),
	maxResults: z.number().int().min(1).max(20).optional(),
});

router.post("/search", async (req, res) => {
	const parsed = SearchRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid search request payload");
		return;
	}

	const relevance = validateTopicRelevance(parsed.data.query);
	if (!relevance.isRelevant) {
		sendError(
			res,
			400,
			relevance.reason || "Search query is not relevant to UPSC syllabus",
		);
		return;
	}

	const userId = req.authUser?.id || "usr_local_admin_0000000000";
	try {
		const result = await executeServerSearch(
			parsed.data.query,
			parsed.data.provider,
			userId,
			parsed.data.maxResults,
		);
		res.json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Search failed";
		sendError(res, 502, message);
	}
});

router.get("/search/duckduckgo", async (req, res) => {
	const query = req.query.q as string;
	if (!query) {
		sendError(res, 400, 'Query parameter "q" is required');
		return;
	}

	const relevance = validateTopicRelevance(query);
	if (!relevance.isRelevant) {
		sendError(
			res,
			400,
			relevance.reason || "Search query is not relevant to UPSC syllabus",
		);
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
