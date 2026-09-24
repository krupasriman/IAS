import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/errors";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Protects state-changing endpoints from Cross-Site Request Forgery (CSRF).
 * Requires custom headers or JSON content-type that cannot be triggered by simple HTML forms.
 */
export function csrfProtection(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (!MUTATING_METHODS.has(req.method)) {
		next();
		return;
	}

	const hasCsrfIndicator =
		Boolean(req.headers["x-requested-with"]) ||
		Boolean(req.headers["x-ias-client"]) ||
		Boolean(req.headers.authorization) ||
		Boolean(req.is("application/json"));

	if (!hasCsrfIndicator) {
		sendError(
			res,
			403,
			"CSRF validation failed: Missing required client indicator header",
		);
		return;
	}

	next();
}
