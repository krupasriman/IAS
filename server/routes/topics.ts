import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { CategorySchema } from "../../src/utils/topicSchema";
import {
	createTopic,
	deleteTopic,
	getTopic,
	listTopics,
	replaceAllTopics,
	updateTopic,
} from "../services/topics";
import { sendError, sendNotFound } from "../utils/errors";

const router = Router();

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

router.get("/topics", async (_req: ExpressRequest, res: Response) => {
	const topics = await listTopics();
	res.json({ topics });
});

router.get("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const topic = await getTopic(String(req.params.id));
	if (!topic) {
		sendNotFound(res, "Topic not found");
		return;
	}
	res.json({ topic });
});

router.post("/topics", async (req: ExpressRequest, res: Response) => {
	const parsed = TopicSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid topic payload");
		return;
	}
	const topic = await createTopic(parsed.data);
	res.status(201).json({ topic });
});

router.put("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const parsed = TopicSchema.safeParse(req.body);
	if (!parsed.success) {
		sendError(res, 400, "Invalid topic payload");
		return;
	}
	const existing = await getTopic(String(req.params.id));
	if (!existing) {
		sendNotFound(res, "Topic not found");
		return;
	}
	const topic = await updateTopic(String(req.params.id), parsed.data);
	res.json({ topic });
});

router.delete("/topics/:id", async (req: ExpressRequest, res: Response) => {
	const deleted = await deleteTopic(String(req.params.id));
	if (!deleted) {
		sendNotFound(res, "Topic not found");
		return;
	}
	res.json({ ok: true });
});

router.post("/topics/import", async (req: ExpressRequest, res: Response) => {
	const body = z.object({ topics: z.array(TopicSchema) }).safeParse(req.body);
	if (!body.success) {
		sendError(res, 400, "Invalid topics payload");
		return;
	}
	await replaceAllTopics(body.data.topics);
	res.json({ ok: true });
});

export default router;
