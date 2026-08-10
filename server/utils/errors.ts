import type { Response } from "express";

export interface ErrorResponse {
	error: string;
	details?: Record<string, string[]>;
}

export function sendError(
	res: Response,
	status: number,
	error: string,
	details?: Record<string, string[]>,
): void {
	const body: ErrorResponse = { error };
	if (details) body.details = details;
	res.status(status).json(body);
}

export function sendValidationError(
	res: Response,
	error: string,
	details: Record<string, string[]>,
): void {
	sendError(res, 400, error, details);
}

export function sendNotFound(res: Response, message: string): void {
	sendError(res, 404, message);
}

export function sendServerError(
	res: Response,
	error: string = "Internal server error",
): void {
	sendError(res, 500, error);
}

// HttpError class not allowed with erasableSyntaxOnly; use functions above instead
