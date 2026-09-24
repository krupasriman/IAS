import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger, setCorrelationIdGetter } from "../src/utils/logger";
import "./db/index";
import { attachAuthUser, maybeRequireAuth } from "./middleware/auth";
import { csrfProtection } from "./middleware/csrf";
import authRouter from "./routes/auth";
import generateRouter from "./routes/generate";
import llmRouter from "./routes/llm";
import modelsRouter from "./routes/models";
import searchRouter from "./routes/search";
import settingsRouter from "./routes/settings";
import streamRouter from "./routes/stream";
import topicsRouter from "./routes/topics";
import { seedIfEmpty } from "./services/topics";
import { sendNotFound, sendServerError } from "./utils/errors";
import {
	httpRequestDurationSeconds,
	httpRequestsTotal,
	register,
} from "./utils/metrics";
import { createTieredLimiters } from "./utils/rateLimiter";
import { correlationMiddleware, getCorrelationId } from "./utils/tracing";

setCorrelationIdGetter(getCorrelationId);

const app = express();
const NODE_ENV = process.env.NODE_ENV || "development";

// Trust proxy headers for Vercel / serverless reverse proxies
app.set("trust proxy", 1);

// Normalize URL on Vercel serverless where rewrites to /api might strip the subpath from req.url
app.use((req, _res, next) => {
	const matchedPath =
		(req.headers["x-vercel-matched-path"] as string) ||
		(req.headers["x-matched-path"] as string) ||
		(req.headers["x-forwarded-uri"] as string) ||
		(req.headers["x-original-url"] as string) ||
		(req.headers["x-rewrite-url"] as string);

	if (
		matchedPath &&
		(req.url === "/" ||
			req.url === "/api" ||
			req.url === "/api/" ||
			req.url === "/index" ||
			req.url === "/api/index")
	) {
		const query = req.url.includes("?")
			? req.url.slice(req.url.indexOf("?"))
			: "";
		req.url =
			(matchedPath.startsWith("/") ? matchedPath : `/${matchedPath}`) + query;
	} else if (
		(req.url === "/" ||
			req.url === "/api" ||
			req.url === "/api/" ||
			req.url === "/index" ||
			req.url === "/api/index") &&
		req.headers["x-now-route-matches"]
	) {
		const routeMatches = req.headers["x-now-route-matches"] as string;
		const match = routeMatches.match(/1=([^&;]+)/);
		if (match?.[1]) {
			const subpath = decodeURIComponent(match[1]);
			const query = req.url.includes("?")
				? req.url.slice(req.url.indexOf("?"))
				: "";
			req.url = `/api/${subpath}${query}`;
		}
	}
	next();
});

// Attach correlation ID and enter tracing context
app.use(correlationMiddleware);

// Security headers
app.use(
	helmet({
		contentSecurityPolicy: NODE_ENV === "production",
		crossOriginEmbedderPolicy: false,
	}),
);

// Tiered rate limiting (in-memory defaults, upgraded to Redis when REDIS_URL is connected)
let dynamicApiLimiter: express.RequestHandler = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: NODE_ENV === "production" ? 300 : 3000,
	message: { error: "Too many requests, please try again later" },
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false, default: false },
});

let dynamicAuthLimiter: express.RequestHandler = rateLimit({
	windowMs: 60 * 1000,
	max: NODE_ENV === "production" ? 5 : 100,
	message: {
		error: "Too many authentication attempts, please try again after a minute",
	},
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false, default: false },
});

let dynamicGenLimiter: express.RequestHandler = rateLimit({
	windowMs: 60 * 1000,
	max: NODE_ENV === "production" ? 10 : 200,
	message: {
		error:
			"Generation rate limit reached, please wait a minute before generating more notes",
	},
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false, default: false },
});

void createTieredLimiters()
	.then(({ authLimiter, generationLimiter, apiLimiter }) => {
		dynamicAuthLimiter = authLimiter;
		dynamicGenLimiter = generationLimiter;
		dynamicApiLimiter = apiLimiter;
	})
	.catch(() => {});

const defaultAllowedOrigins = [
	"https://ias-phi.vercel.app",
	"http://localhost:5173",
	"http://localhost:3000",
	"http://localhost:3001",
	"http://127.0.0.1:5173",
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
	: defaultAllowedOrigins;

app.use(
	cors({
		origin: (origin, callback) => {
			// Allow server-to-server or same-origin requests with no origin header
			if (!origin) {
				callback(null, true);
				return;
			}
			if (
				NODE_ENV !== "production" ||
				configuredOrigins.includes(origin) ||
				origin.endsWith(".vercel.app")
			) {
				callback(null, true);
				return;
			}
			callback(new Error("CORS origin not allowed"));
		},
		credentials: true,
	}),
);
app.use(express.json());

// Native cookie parser for serverless compatibility
app.use((req, _res, next) => {
	const cookieHeader = req.headers.cookie;
	const cookies: Record<string, string> = {};
	if (cookieHeader) {
		for (const part of cookieHeader.split(";")) {
			const [k, ...v] = part.trim().split("=");
			if (k) {
				try {
					cookies[k] = decodeURIComponent(v.join("="));
				} catch {
					cookies[k] = v.join("=");
				}
			}
		}
	}
	req.cookies = cookies;
	next();
});

// Attach session user (if any) to every request
app.use(attachAuthUser);

// Structured request logging & Prometheus HTTP metrics
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const durationMs = Date.now() - start;
		const cleanPath = req.baseUrl || req.path;
		httpRequestsTotal.inc({
			method: req.method,
			path: cleanPath,
			status: String(res.statusCode),
		});
		httpRequestDurationSeconds.observe(
			{
				method: req.method,
				path: cleanPath,
				status: String(res.statusCode),
			},
			durationMs / 1000,
		);
		logger.info(
			{
				method: req.method,
				path: req.path,
				status: res.statusCode,
				durationMs,
			},
			"request completed",
		);
	});
	next();
});

// Prometheus metrics scraping endpoint
app.get(["/metrics", "/api/metrics"], async (_req, res) => {
	try {
		res.setHeader("Content-Type", register.contentType);
		res.send(await register.metrics());
	} catch (err) {
		res.status(500).send(err instanceof Error ? err.message : String(err));
	}
});

const apiPrefixes = ["/api", "/"];

app.use(apiPrefixes, (req, res, next) => dynamicApiLimiter(req, res, next));

// Auth rate limiter on credential endpoints
app.use(
	["/api/auth/login", "/auth/login", "/api/auth/register", "/auth/register"],
	(req, res, next) => dynamicAuthLimiter(req, res, next),
);

// Generation rate limiter on AI inference endpoints
app.use(
	[
		"/api/generate",
		"/generate",
		"/api/generate/stream",
		"/generate/stream",
		"/api/llm",
		"/llm",
	],
	(req, res, next) => dynamicGenLimiter(req, res, next),
);

app.get(["/api/health", "/health"], (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

void seedIfEmpty();

// Enforce CSRF protection for mutating requests
app.use(apiPrefixes, csrfProtection);

// Public auth endpoints (/api/auth/login, /api/auth/logout, /api/auth/register, /api/auth/me)
app.use(apiPrefixes, authRouter);

// Enforce authentication when AUTH_MODE=session
app.use(apiPrefixes, maybeRequireAuth);

// Protected operational endpoints
app.use(apiPrefixes, modelsRouter);
app.use(apiPrefixes, llmRouter);
app.use(apiPrefixes, generateRouter);
app.use(apiPrefixes, streamRouter);
app.use(apiPrefixes, searchRouter);
app.use(apiPrefixes, topicsRouter);
app.use(apiPrefixes, settingsRouter);

// 404 handler for API routes
app.use(apiPrefixes, (req, res) => {
	logger.warn({ method: req.method, path: req.path }, "API endpoint not found");
	sendNotFound(res, `API endpoint not found: ${req.method} ${req.path}`);
});

// Global error handler - ensures all errors return JSON.
app.use(
	(
		err: unknown,
		req: express.Request,
		res: express.Response,
		_next: express.NextFunction,
	) => {
		const message =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message: unknown }).message)
				: undefined;
		logger.error({ err, method: req.method, path: req.path }, "Server error");
		sendServerError(res, message || "Internal server error");
	},
);

export default app;
