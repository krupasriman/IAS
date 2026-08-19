import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app";

export const maxDuration = 60;

export default function handler(req: IncomingMessage, res: ServerResponse) {
	return app(req, res);
}

export { app };
