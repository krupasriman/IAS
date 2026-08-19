import { Router } from "express";
import { logger } from "../../src/utils/logger";
import { resolveLlmApiKey } from "../services/keyResolver";
import { sendError } from "../utils/errors";

const router = Router();

interface ModelsApiResponse {
	data?: unknown;
	error?: string;
}

async function fetchModels(
	url: string,
	authHeader: string | undefined,
	logName: string,
): Promise<{ status: number; body: ModelsApiResponse }> {
	try {
		const headers: Record<string, string> = {
			"HTTP-Referer": "https://ias.app",
			"X-Title": "IAS Study Notes Generator",
		};
		if (authHeader) {
			const key = authHeader.replace(/^Bearer\s+/i, "").trim();
			if (key) {
				headers.Authorization = `Bearer ${key}`;
			}
		}
		const response = await fetch(url, { headers });
		if (!response.ok) {
			logger.warn(
				{ status: response.status },
				`${logName} models request failed with status ${response.status}`,
			);
			return {
				status: response.status,
				body: { error: `${logName} API returned ${response.status}` },
			};
		}
		const data = (await response.json()) as ModelsApiResponse;
		logger.info(
			{
				count: Array.isArray(data.data) ? data.data.length : undefined,
			},
			`${logName} models fetched`,
		);
		return { status: 200, body: data };
	} catch (error: unknown) {
		const message =
			typeof error === "object" && error !== null && "message" in error
				? String((error as { message: unknown }).message)
				: `Failed to fetch models from ${logName}`;
		logger.warn({ err: message }, `Failed to fetch models from ${logName}`);
		return {
			status: 502,
			body: { error: message },
		};
	}
}

router.get("/openrouter/models", async (req, res) => {
	let authHeader = req.headers.authorization;
	if (!authHeader) {
		const key = await resolveLlmApiKey("openrouter");
		if (key) {
			authHeader = `Bearer ${key}`;
		}
	}
	const result = await fetchModels(
		"https://openrouter.ai/api/v1/models",
		authHeader,
		"OpenRouter",
	);
	if (result.status === 200) {
		res.json(result.body);
	} else {
		sendError(res, result.status, result.body.error ?? "Unknown error");
	}
});

router.get("/generalcompute/models", async (req, res) => {
	let authHeader = req.headers.authorization;
	if (!authHeader) {
		const key = await resolveLlmApiKey("generalcompute");
		if (key) {
			authHeader = `Bearer ${key}`;
		}
	}
	const result = await fetchModels(
		"https://api.generalcompute.com/v1/public/models",
		authHeader,
		"General Compute",
	);
	if (result.status === 200) {
		res.json(result.body);
	} else {
		sendError(res, result.status, result.body.error ?? "Unknown error");
	}
});

export default router;
