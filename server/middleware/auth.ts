import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "../services/auth";
import {
	getOrCreateLocalUser,
	getSessionUser,
	isAuthEnabled,
	SESSION_COOKIE,
} from "../services/auth";
import { sendError } from "../utils/errors";

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
	try {
		const token = req.cookies?.[SESSION_COOKIE] ?? "";
		if (token) {
			req.authUser = await getSessionUser(token);
		} else if (!isAuthEnabled()) {
			req.authUser = await getOrCreateLocalUser();
		} else {
			req.authUser = null;
		}
	} catch {
		req.authUser = null;
	}
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
