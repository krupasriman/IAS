import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface TracingContext {
	correlationId: string;
	userId?: string;
}

const tracingStorage = new AsyncLocalStorage<TracingContext>();

export function generateCorrelationId(): string {
	return randomUUID();
}

export function getTracingContext(): TracingContext | undefined {
	return tracingStorage.getStore();
}

export function getCorrelationId(): string | undefined {
	return tracingStorage.getStore()?.correlationId;
}

export function runWithTracingContext<T>(
	context: TracingContext,
	fn: () => T,
): T {
	return tracingStorage.run(context, fn);
}

/**
 * Express middleware that extracts or generates a correlation ID for the request,
 * attaches it to the response header, and enters the AsyncLocalStorage tracing context.
 */
export function correlationMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const headerVal = req.headers["x-correlation-id"];
	const correlationId =
		typeof headerVal === "string" && headerVal.trim()
			? headerVal.trim()
			: generateCorrelationId();

	res.setHeader("x-correlation-id", correlationId);

	const context: TracingContext = {
		correlationId,
		userId: req.authUser?.id,
	};

	tracingStorage.run(context, () => {
		next();
	});
}
