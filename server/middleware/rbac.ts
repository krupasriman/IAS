import type { NextFunction, Request, Response } from "express";
import { isAuthEnabled } from "../services/auth";
import { sendError } from "../utils/errors";

export function requireRole(role: "admin" | "user") {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!isAuthEnabled()) {
			// In local mode, treat user as admin
			next();
			return;
		}

		if (!req.authUser) {
			sendError(res, 401, "Authentication required");
			return;
		}

		if (role === "admin" && req.authUser.role !== "admin") {
			sendError(res, 403, "Administrator privilege required");
			return;
		}

		next();
	};
}
