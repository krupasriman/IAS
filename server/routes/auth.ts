import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
	createSession,
	createUser,
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

const RegisterSchema = z.object({
	username: z.string().min(3).max(50),
	password: z.string().min(8).max(100),
	role: z.enum(["admin", "user"]).optional(),
});

function getCookieHeader(token: string, maxAge: number): string {
	const isProd = process.env.NODE_ENV === "production";
	const flags = [
		`${SESSION_COOKIE}=${token}`,
		"HttpOnly",
		"Path=/",
		"SameSite=Lax",
		`Max-Age=${maxAge}`,
	];
	if (isProd) {
		flags.push("Secure");
	}
	return flags.join("; ");
}

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
	res.setHeader("Set-Cookie", getCookieHeader(token, 604800));
	res.json({ user });
});

router.post("/auth/register", async (req: ExpressRequest, res: Response) => {
	if (!isAuthEnabled()) {
		sendError(res, 403, "Authentication is disabled in local mode");
		return;
	}

	const parsed = RegisterSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(
			res,
			400,
			"Registration failed: Username must be at least 3 characters and password at least 8 characters",
		);
		return;
	}

	try {
		const user = await createUser(
			parsed.data.username,
			parsed.data.password,
			parsed.data.role ?? "user",
		);

		const token = await createSession(user);
		res.setHeader("Set-Cookie", getCookieHeader(token, 604800));
		res.status(201).json({ user, ok: true });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("unique") || msg.includes("duplicate")) {
			sendError(res, 409, "Username is already registered");
			return;
		}
		sendError(res, 500, "Registration failed");
	}
});

router.post("/auth/logout", async (req: ExpressRequest, res: Response) => {
	const token = req.cookies?.[SESSION_COOKIE] ?? "";
	if (token) {
		await destroySession(token);
	}
	res.setHeader("Set-Cookie", getCookieHeader("", 0));
	res.json({ ok: true });
});

router.get("/auth/me", (req: ExpressRequest, res: Response) => {
	res.json({
		user: req.authUser ?? null,
		authEnabled: isAuthEnabled(),
	});
});

router.get("/auth/profile", (req: ExpressRequest, res: Response) => {
	if (!req.authUser) {
		sendError(res, 401, "Authentication required");
		return;
	}
	res.json({ user: req.authUser });
});

export default router;
