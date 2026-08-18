import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger } from "../src/utils/logger.ts";
import "./db/index.ts";
import { attachAuthUser, maybeRequireAuth } from "./middleware/auth.ts";
import authRouter from "./routes/auth.ts";
import generateRouter from "./routes/generate.ts";
import llmRouter from "./routes/llm.ts";
import modelsRouter from "./routes/models.ts";
import searchRouter from "./routes/search.ts";
import settingsRouter from "./routes/settings.ts";
import streamRouter from "./routes/stream.ts";
import topicsRouter from "./routes/topics.ts";
import { seedIfEmpty } from "./services/topics.ts";
import { sendNotFound, sendServerError } from "./utils/errors.ts";
import { createApiLimiter } from "./utils/rateLimiter.ts";

dotenv.config();

const app = express();
const NODE_ENV = process.env.NODE_ENV || "development";

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
});

void createApiLimiter().then((limiter) => {
	dynamicLimiter = limiter;
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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
