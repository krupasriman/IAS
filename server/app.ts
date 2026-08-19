import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger } from "../src/utils/logger";
import "./db/index";
import { attachAuthUser, maybeRequireAuth } from "./middleware/auth";
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
import { createApiLimiter } from "./utils/rateLimiter";

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

// Security headers
app.use(
	helmet({
		contentSecurityPolicy: NODE_ENV === "production",
		crossOriginEmbedderPolicy: false,
	}),
);

// Rate limiting (in-memory default, upgraded to Redis when REDIS_URL is connected)
let dynamicLimiter: express.RequestHandler = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: NODE_ENV === "production" ? 100 : 2000,
	message: { error: "Too many requests, please try again later" },
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false },
});

void createApiLimiter()
	.then((limiter) => {
		dynamicLimiter = limiter;
	})
	.catch(() => {});

app.use(cors());
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

// Structured request logging
app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const duration = Date.now() - start;
		logger.info(
			{
				method: req.method,
				path: req.path,
				status: res.statusCode,
				durationMs: duration,
			},
			"request completed",
		);
	});
	next();
});

const apiPrefixes = ["/api", "/"];

app.use(apiPrefixes, (req, res, next) => dynamicLimiter(req, res, next));

app.get(["/api/health", "/health"], (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

void seedIfEmpty();

app.use(apiPrefixes, modelsRouter);
app.use(apiPrefixes, llmRouter);
app.use(apiPrefixes, generateRouter);
app.use(apiPrefixes, streamRouter);
app.use(apiPrefixes, searchRouter);
app.use(apiPrefixes, authRouter);
app.use(apiPrefixes, maybeRequireAuth);
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
