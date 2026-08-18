import { createRequire } from "node:module";
import app from "../server/app";

// Polyfill require for CommonJS modules in ESM serverless bundle
if (typeof globalThis.require === "undefined") {
	(globalThis as unknown as { require: NodeRequire }).require = createRequire(
		import.meta.url,
	);
}

export default app;
