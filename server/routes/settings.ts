import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
	deleteApiKey,
	listConfiguredApiKeys,
	storeApiKey,
} from "../services/apiKeys";
import { sendError, sendNotFound } from "../utils/errors";

const router = Router();

const DEFAULT_USER_ID = "usr_local_admin_0000000000";

function getUserId(req: ExpressRequest): string {
	return req.authUser?.id || DEFAULT_USER_ID;
}

const StoreKeySchema = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
	value: z.string().min(1),
});

const DeleteKeyParams = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
});

router.get("/settings/api-keys", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const configured = await listConfiguredApiKeys(userId);
	res.json({ configured });
});

router.post(
	"/settings/api-keys",
	async (req: ExpressRequest, res: Response) => {
		const userId = getUserId(req);
		const parsed = StoreKeySchema.safeParse(req.body);
		if (!parsed.success) {
			sendError(res, 400, "Invalid API key payload");
			return;
		}
		await storeApiKey(
			userId,
			parsed.data.kind,
			parsed.data.provider,
			parsed.data.value,
		);
		res.status(201).json({ ok: true });
	},
);

router.delete(
	"/settings/api-keys/:kind/:provider",
	async (req: ExpressRequest, res: Response) => {
		const userId = getUserId(req);
		const parsed = DeleteKeyParams.safeParse({
			kind: req.params.kind,
			provider: req.params.provider,
		});
		if (!parsed.success) {
			sendError(res, 400, "Invalid API key path");
			return;
		}
		const deleted = await deleteApiKey(
			userId,
			parsed.data.kind,
			parsed.data.provider,
		);
		if (!deleted) {
			sendNotFound(res, "API key not found");
			return;
		}
		res.json({ ok: true });
	},
);

export default router;
