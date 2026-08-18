import dotenv from "dotenv";
import { logger } from "../src/utils/logger";
import app from "./app";
import { sendNotFound } from "./utils/errors";

dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// 404 handler for non-API routes in standalone mode
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
		const { closeRedis } = await import("./utils/rateLimiter");
		await closeRedis();
	} catch {
		// best-effort
	}
	process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
