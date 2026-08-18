import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app";

export default function handler(req: IncomingMessage, res: ServerResponse) {
	if (req.url === "/api" || req.url === "/api/") {
		const matchedPath = req.headers["x-matched-path"] as string | undefined;
		if (matchedPath?.startsWith("/api")) {
			req.url = matchedPath;
		}
	}
	return app(req, res);
}
