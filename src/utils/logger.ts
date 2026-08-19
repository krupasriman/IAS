import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isServerless = Boolean(
	process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);
const isDev = !isProduction && !isServerless;

export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport: isDev
		? {
				target: "pino-pretty",
				options: { colorize: true, translateTime: "SYS:standard" },
			}
		: undefined,
});
