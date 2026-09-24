import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
	deleteApiKey,
	hasAnyActiveKey,
	listConfiguredApiKeys,
	storeApiKey,
} from "../services/apiKeys";
import { verifyProviderApiKey } from "../services/keyValidator";
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
	validate: z.boolean().optional().default(true),
});

const ValidateKeySchema = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
	value: z.string().min(1),
});

const DeleteKeyParams = z.object({
	kind: z.enum(["llm", "search"]),
	provider: z.string().min(1).max(100),
});

/**
 * Returns configured providers and whether at least one LLM key is ready.
 * Does NOT return the raw API keys.
 */
router.get(
	"/settings/api-keys/status",
	async (req: ExpressRequest, res: Response) => {
		const userId = getUserId(req);
		const configured = await listConfiguredApiKeys(userId);
		const hasConfiguredKey = configured.llm.length > 0;
		res.json({
			hasConfiguredKey,
			configured,
			userId,
		});
	},
);

router.get("/settings/api-keys", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const configured = await listConfiguredApiKeys(userId);
	res.json({ configured });
});

/**
 * Validates an API key with the upstream provider without persisting it.
 */
router.post(
	"/settings/api-keys/validate",
	async (req: ExpressRequest, res: Response) => {
		const parsed = ValidateKeySchema.safeParse(req.body);
		if (!parsed.success) {
			sendError(res, 400, "Invalid validation payload");
			return;
		}

		const result = await verifyProviderApiKey(
			parsed.data.kind,
			parsed.data.provider,
			parsed.data.value,
		);

		if (!result.valid) {
			res.status(422).json({
				ok: false,
				error: result.error || "API key verification failed",
			});
			return;
		}

		res.json({ ok: true });
	},
);

router.post(
	"/settings/api-keys",
	async (req: ExpressRequest, res: Response) => {
		const userId = getUserId(req);
		const parsed = StoreKeySchema.safeParse(req.body);
		if (!parsed.success) {
			sendError(res, 400, "Invalid API key payload");
			return;
		}

		const { kind, provider, value, validate } = parsed.data;

		// Live validation check prior to encryption and persistence
		if (validate) {
			const validation = await verifyProviderApiKey(kind, provider, value);
			if (!validation.valid) {
				res.status(422).json({
					ok: false,
					error:
						validation.error ||
						`The provided API key could not be verified with ${provider}.`,
				});
				return;
			}
		}

		await storeApiKey(userId, kind, provider, value);
		const hasConfiguredKey = await hasAnyActiveKey(userId);

		res.status(201).json({
			ok: true,
			hasConfiguredKey,
			provider,
			kind,
		});
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
		const hasConfiguredKey = await hasAnyActiveKey(userId);
		res.json({ ok: true, hasConfiguredKey });
	},
);

export default router;
