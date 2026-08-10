import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
	deleteApiKey,
	listConfiguredApiKeys,
	storeApiKey,
} from "../services/apiKeys.ts";
import { sendError, sendNotFound } from "../utils/errors.ts";

const router = Router();

const StoreKeySchema = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
	value: z.string().min(1),
});

const DeleteKeyParams = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
});

router.get("/settings/api-keys", async (_req, res) => {
	const configured = await listConfiguredApiKeys();
	res.json({ configured });
});

router.post(
	"/settings/api-keys",
	async (req: ExpressRequest, res: Response) => {
		const parsed = StoreKeySchema.safeParse(req.body);
		if (!parsed.success) {
			sendError(res, 400, "Invalid API key payload");
			return;
		}
		await storeApiKey(
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
		const parsed = DeleteKeyParams.safeParse({
			kind: req.params.kind,
			provider: req.params.provider,
		});
		if (!parsed.success) {
			sendError(res, 400, "Invalid API key path");
			return;
		}
		const deleted = await deleteApiKey(parsed.data.kind, parsed.data.provider);
		if (!deleted) {
			sendNotFound(res, "API key not found");
			return;
		}
		res.json({ ok: true });
	},
);

export default router;
