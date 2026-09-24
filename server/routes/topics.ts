import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { CategorySchema } from "../../src/utils/topicSchema";
import {
	createTopic,
	deleteTopic,
	getTopic,
	listTopics,
	listTopicsPaginated,
	replaceAllTopics,
	updateTopic,
} from "../services/topics";
import { sendError, sendNotFound } from "../utils/errors";

const router = Router();

const DEFAULT_USER_ID = "usr_local_admin_0000000000";

function getUserId(req: ExpressRequest): string {
	return req.authUser?.id || DEFAULT_USER_ID;
}

const ProConItemSchema = z.object({
	id: z.string().optional(),
	title: z.string(),
	explanation: z.string(),
	example: z.string(),
});

const TopicSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	category: CategorySchema,
	meaning: z.string(),
	quote: z.object({
		text: z.string(),
		source: z.string(),
	}),
	pros: z.array(ProConItemSchema),
	cons: z.array(ProConItemSchema),
	wayForward: z.array(z.string()),
	conclusion: z.union([
		z.object({
			negative: z.string(),
			positive: z.string(),
		}),
		z.string(),
	]),
	source: z.enum(["local", "web"]),
	tags: z.array(z.string()).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

router.get("/topics", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const { cursor, limit, category, search } = req.query;

	if (cursor !== undefined || limit !== undefined) {
		const parsedLimit = limit
			? Math.min(Math.max(Number(limit) || 25, 1), 100)
			: 25;
		const result = await listTopicsPaginated(userId, {
			cursor: typeof cursor === "string" ? cursor : undefined,
			limit: parsedLimit,
			category: typeof category === "string" ? category : undefined,
			search: typeof search === "string" ? search : undefined,
		});
		res.json(result);
		return;
	}

	const topics = await listTopics(userId);
	res.json({ topics });
});

router.get("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const topic = await getTopic(String(req.params.id), userId);
	if (!topic) {
		sendNotFound(res, "Topic not found");
		return;
	}
	res.json({ topic });
});

router.post("/topics", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const parsed = TopicSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid topic payload");
		return;
	}
	try {
		const topic = await createTopic(parsed.data, userId);
		res.status(201).json({ topic });
	} catch (_err) {
		sendError(res, 500, "Failed to create topic");
	}
});

router.put("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const parsed = TopicSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid topic payload");
		return;
	}
	const existing = await getTopic(String(req.params.id), userId);
	if (!existing) {
		sendNotFound(res, "Topic not found");
		return;
	}
	const topic = await updateTopic(String(req.params.id), parsed.data, userId);
	res.json({ topic });
});

router.delete("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const deleted = await deleteTopic(String(req.params.id), userId);
	if (!deleted) {
		sendNotFound(res, "Topic not found");
		return;
	}
	res.json({ ok: true });
});

router.post("/topics/import", async (req: ExpressRequest, res: Response) => {
	const userId = getUserId(req);
	const body = z.object({ topics: z.array(TopicSchema) }).safeParse(req.body);
	if (!body.success) {
		sendError(res, 400, "Invalid topics payload");
		return;
	}
	await replaceAllTopics(body.data.topics, userId);
	res.json({ ok: true });
});

export default router;
