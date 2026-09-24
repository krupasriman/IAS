import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isServerless = Boolean(
	process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);
const isDev = !isProduction && !isServerless;

let correlationIdGetter: (() => string | undefined) | null = null;

export function setCorrelationIdGetter(fn: () => string | undefined): void {
	correlationIdGetter = fn;
}

export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	redact: [
		"apiKey",
		"*.apiKey",
		"headers.authorization",
		"authorization",
		"encrypted",
		"password",
		"salt",
	],
	mixin() {
		const correlationId = correlationIdGetter?.();
		return correlationId ? { correlationId } : {};
	},
	transport: isDev
		? {
				target: "pino-pretty",
				options: { colorize: true, translateTime: "SYS:standard" },
			}
		: undefined,
});
