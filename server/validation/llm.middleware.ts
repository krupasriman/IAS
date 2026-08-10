import type express from "express";
import { sendValidationError } from "../utils/errors.ts";
import { LLMRequestSchema } from "../validation/llm.ts";

export const validateLLMRequest: express.RequestHandler = (req, res, next) => {
	const result = LLMRequestSchema.safeParse(req.body);
	if (!result.success) {
		sendValidationError(
			res,
			"Invalid request payload",
			result.error.flatten().fieldErrors,
		);
		return;
	}
	// Attach validated data to request for type safety
	req.body = result.data;
	next();
};
