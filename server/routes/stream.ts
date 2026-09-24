import { type ModelMessage, streamText } from "ai";
import type { Request as ExpressRequest, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { getLanguageModel } from "../../src/services/llm/provider";
import { logger } from "../../src/utils/logger";
import { validateTopicRelevance } from "../../src/utils/topicGuardrail";
import {
	CategorySchema,
	StructuredTopicSchema,
} from "../../src/utils/topicSchema";
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from "../prompts/prompts";
import {
	generateTopicCacheKey,
	getCachedTopic,
	setCachedTopic,
} from "../services/cache/llmCache";
import { resolveLlmApiKey } from "../services/keyResolver";
import { sendError } from "../utils/errors";
import { LLMProviderSchema } from "../validation/llm";

const StreamRequestSchema = z.object({
	topic: z.string().min(1).max(200),
	category: CategorySchema.optional(),
	webContext: z.string().optional(),
	provider: LLMProviderSchema,
	apiKey: z.string().min(1).optional(),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).optional(),
	baseUrl: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().url().optional(),
	),
	forceRefresh: z.boolean().optional(),
});

const router = Router();

router.post("/generate/stream", async (req: ExpressRequest, res: Response) => {
	const parsed = StreamRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		const details: Record<string, string[]> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path.join(".") || "body";
			if (!details[key]) {
				details[key] = [];
			}
			details[key].push(issue.message);
		}
		sendError(res, 400, "Invalid stream request", details);
		return;
	}

	const {
		topic,
		category,
		webContext,
		provider,
		apiKey,
		model,
		temperature,
		baseUrl,
		forceRefresh,
	} = parsed.data;

	// Initialize SSE Headers
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
	});

	const sendSSE = (event: string, data: unknown) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	};

	const relevance = validateTopicRelevance(topic);
	if (!relevance.isRelevant) {
		sendSSE("error", {
			message:
				relevance.reason ||
				"The query is not a recognized UPSC / IAS syllabus topic.",
		});
		res.end();
		return;
	}

	const cacheKey = generateTopicCacheKey(topic, category, webContext);
	if (!forceRefresh) {
		const cached = await getCachedTopic(cacheKey);
		if (cached) {
			sendSSE("status", {
				stage: "cached",
				message: "Retrieved instantly from cache (<50ms)",
			});
			sendSSE("complete", { topic: cached, cached: true });
			res.end();
			return;
		}
	}

	const messages = [
		{ role: "system" as const, content: IAS_SYSTEM_PROMPT },
		{
			role: "user" as const,
			content: buildUserPrompt(topic, category, webContext),
		},
	];

	try {
		const resolvedApiKey = await resolveLlmApiKey(
			provider,
			apiKey,
			req.authUser?.id,
		);
		if (!resolvedApiKey) {
			sendSSE("error", { message: "No API key configured for this provider" });
			res.end();
			return;
		}

		sendSSE("status", {
			stage: "generating",
			message: "Synthesizing UPSC study note with AI...",
		});

		const systemMessage = messages.find((m) => m.role === "system")?.content;
		const otherMessages = messages.filter(
			(m) => m.role !== "system",
		) as ModelMessage[];

		const languageModel = getLanguageModel({
			provider,
			apiKey: resolvedApiKey,
			model,
			baseUrl,
		});

		const result = streamText({
			model: languageModel,
			system: systemMessage,
			messages: otherMessages,
			temperature: temperature ?? 0.3,
			onError: ({ error }) => {
				logger.error({ err: String(error) }, "AI SDK stream error");
			},
		});

		let accumulated = "";
		for await (const chunk of result.textStream) {
			accumulated += chunk;
			sendSSE("chunk", { text: chunk });
		}

		sendSSE("status", {
			stage: "validating",
			message: "Validating against IAS five-part framework...",
		});

		const cleaned = accumulated.replace(/```(?:json)?/gi, "").trim();
		const jsonStart = cleaned.indexOf("{");
		const jsonEnd = cleaned.lastIndexOf("}");

		if (jsonStart === -1 || jsonEnd === -1) {
			throw new Error("Model response did not contain a valid JSON object");
		}

		const parsedJson = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
		const validatedTopic = StructuredTopicSchema.parse(parsedJson);

		const now = new Date().toISOString();
		const finalTopic = {
			...validatedTopic,
			id: crypto.randomUUID(),
			source: "web" as const,
			createdAt: now,
			updatedAt: now,
		};

		// Store in cache for future instant hits
		void setCachedTopic(cacheKey, finalTopic);

		sendSSE("complete", { topic: finalTopic });
	} catch (error: unknown) {
		const message =
			typeof error === "object" && error !== null && "message" in error
				? String((error as { message: unknown }).message)
				: "Streaming generation failed";
		logger.error({ err: message }, "Stream error");
		sendSSE("error", { message });
	} finally {
		res.end();
	}
});

export default router;
