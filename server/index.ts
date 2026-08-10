import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
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
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Security headers
app.use(
	helmet({
		contentSecurityPolicy: NODE_ENV === "production",
		crossOriginEmbedderPolicy: false,
	}),
);

// Rate limiting (Redis-backed when REDIS_URL is set, otherwise in-memory)
const apiLimiter = await createApiLimiter();

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

app.use("/api/", apiLimiter);

app.get("/api/health", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

void seedIfEmpty();

app.use("/api", modelsRouter);
app.use("/api", llmRouter);
app.use("/api", generateRouter);
app.use("/api", streamRouter);
app.use("/api", searchRouter);
app.use("/api", authRouter);
app.use("/api", maybeRequireAuth);
app.use("/api", topicsRouter);
app.use("/api", settingsRouter);

// 404 handler for API routes
app.use("/api", (req, res) => {
	logger.warn({ method: req.method, path: req.path }, "API endpoint not found");
	sendNotFound(res, `API endpoint not found: ${req.method} ${req.path}`);
});

// Global error handler - ensures all errors return JSON.
// Must be registered AFTER all routes so it catches their errors.
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

// 404 handler for non-API routes
app.use((_req, res) => {
	sendNotFound(res, "Not found");
});

app.listen(PORT, () => {
	logger.info({ port: PORT, env: NODE_ENV }, "Server started");
});

// Graceful shutdown
async function shutdown(signal: string) {
	logger.info({ signal }, "Shutting down");
	try {
		const { closeRedis } = await import("./utils/rateLimiter.ts");
		await closeRedis();
	} catch {
		// best-effort
	}
	process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
