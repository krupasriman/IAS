import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "../services/auth.ts";
import {
	getSessionUser,
	isAuthEnabled,
	SESSION_COOKIE,
} from "../services/auth.ts";
import { sendError } from "../utils/errors.ts";

declare module "express-serve-static-core" {
	interface Request {
		authUser?: AuthUser | null;
	}
}

export async function attachAuthUser(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	const token = req.cookies?.[SESSION_COOKIE] ?? "";
	req.authUser = token ? await getSessionUser(token) : null;
	next();
}

export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (req.authUser) {
		next();
		return;
	}
	sendError(res, 401, "Authentication required");
}

// Requires a session only when AUTH_MODE=session; otherwise allows local (auth-free) access.
export function maybeRequireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (!isAuthEnabled() || req.authUser) {
		next();
		return;
	}
	sendError(res, 401, "Authentication required");
}
