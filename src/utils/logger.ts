import pino from "pino";

const isServerless = Boolean(
	process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);
const isDev = process.env.NODE_ENV === "development" && !isServerless;

export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport: isDev
		? {
				target: "pino-pretty",
				options: { colorize: true, translateTime: "SYS:standard" },
			}
		: undefined,
});
