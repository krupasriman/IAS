import fs from "node:fs";
import path from "node:path";
import express from "express";
import { logger } from "../src/utils/logger";
import app from "./app";
import { env } from "./config/env";
import { sendNotFound } from "./utils/errors";

const distPath = path.resolve(process.cwd(), "dist");

// In standalone or Docker production mode, serve built frontend assets if present
if (fs.existsSync(distPath)) {
	app.use(express.static(distPath));
	app.get(/^(?!\/api).*/, (_req, res) => {
		res.sendFile(path.join(distPath, "index.html"));
	});
} else {
	// 404 handler for non-API routes in API-only standalone mode
	app.use((_req, res) => {
		sendNotFound(res, "Not found");
	});
}

const server = app.listen(env.PORT, () => {
	logger.info(
		{ port: env.PORT, env: env.NODE_ENV, authMode: env.AUTH_MODE },
		"Server started",
	);
});

// Graceful shutdown
async function shutdown(signal: string) {
	logger.info({ signal }, "Shutting down");
	server.close(async () => {
		try {
			const { closeRedis } = await import("./utils/rateLimiter");
			await closeRedis();
		} catch {
			// best-effort cleanup
		}
		process.exit(0);
	});
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
