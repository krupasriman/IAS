import {
	Counter,
	collectDefaultMetrics,
	Histogram,
	Registry,
} from "prom-client";

export const register = new Registry();

// Collect Node.js process and runtime metrics
collectDefaultMetrics({ register, prefix: "ias_" });

export const httpRequestsTotal = new Counter({
	name: "ias_http_requests_total",
	help: "Total number of HTTP requests processed",
	labelNames: ["method", "path", "status"],
	registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
	name: "ias_http_request_duration_seconds",
	help: "Duration of HTTP requests in seconds",
	labelNames: ["method", "path", "status"],
	buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registers: [register],
});

export const llmTokensTotal = new Counter({
	name: "ias_llm_tokens_total",
	help: "Total number of tokens processed across LLM providers",
	labelNames: ["provider", "model", "type"],
	registers: [register],
});

export const llmDurationSeconds = new Histogram({
	name: "ias_llm_duration_seconds",
	help: "Duration of LLM inference requests in seconds",
	labelNames: ["provider", "model", "status"],
	buckets: [0.2, 0.5, 1, 2, 5, 10, 20, 30, 60],
	registers: [register],
});

export const llmCostEstimatedUsd = new Counter({
	name: "ias_llm_cost_estimated_usd",
	help: "Estimated USD expenditure across LLM calls",
	labelNames: ["provider", "model"],
	registers: [register],
});

export const cacheOperationsTotal = new Counter({
	name: "ias_cache_operations_total",
	help: "Total cache lookups by layer and outcome",
	labelNames: ["type", "outcome"], // type="llm_semantic" | "search_broker", outcome="hit" | "miss"
	registers: [register],
});

export function recordLlmMetrics(opts: {
	provider: string;
	model: string;
	promptTokens?: number;
	completionTokens?: number;
	durationMs: number;
	status: "success" | "error";
}): void {
	const promptTokens = opts.promptTokens || 0;
	const completionTokens = opts.completionTokens || 0;

	if (promptTokens > 0) {
		llmTokensTotal.inc(
			{ provider: opts.provider, model: opts.model, type: "prompt" },
			promptTokens,
		);
	}
	if (completionTokens > 0) {
		llmTokensTotal.inc(
			{ provider: opts.provider, model: opts.model, type: "completion" },
			completionTokens,
		);
	}

	llmDurationSeconds.observe(
		{ provider: opts.provider, model: opts.model, status: opts.status },
		opts.durationMs / 1000,
	);

	// Baseline estimation: ~$0.60/1M prompt, ~$0.80/1M completion tokens
	const cost = promptTokens * 0.0000006 + completionTokens * 0.0000008;
	if (cost > 0) {
		llmCostEstimatedUsd.inc(
			{ provider: opts.provider, model: opts.model },
			cost,
		);
	}
}
