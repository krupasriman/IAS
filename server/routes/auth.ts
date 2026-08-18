import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
	createSession,
	destroySession,
	isAuthEnabled,
	SESSION_COOKIE,
	verifyCredentials,
} from "../services/auth";
import { sendError } from "../utils/errors";

const router = Router();

const LoginSchema = z.object({
	username: z.string().min(1).max(100),
	password: z.string().min(1).max(200),
});

router.post("/auth/login", async (req: ExpressRequest, res: Response) => {
	if (!isAuthEnabled()) {
		sendError(res, 403, "Authentication is disabled in local mode");
		return;
	}

	const parsed = LoginSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid login request");
		return;
	}

	const user = await verifyCredentials(
		parsed.data.username,
		parsed.data.password,
	);
	if (!user) {
		sendError(res, 401, "Invalid username or password");
		return;
	}

	const token = await createSession(user);
	res.setHeader(
		"Set-Cookie",
		`${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
	);
	res.json({ user });
});

router.post("/auth/logout", async (req: ExpressRequest, res: Response) => {
	const token = req.cookies?.[SESSION_COOKIE] ?? "";
	if (token) {
		await destroySession(token);
	}
	res.setHeader(
		"Set-Cookie",
		`${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
	);
	res.json({ ok: true });
});

router.get("/auth/me", (req: ExpressRequest, res: Response) => {
	res.json({
		user: req.authUser ?? null,
		authEnabled: isAuthEnabled(),
	});
});

export default router;
