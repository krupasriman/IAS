import type { CategoryType } from "../types/topic.types";
import { parseMarkdownToTopic } from "./parser";

interface ParseRequest {
	id: string;
	rawText: string;
	title: string;
	category: CategoryType;
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
	const { id, rawText, title, category } = event.data;
	try {
		const topic = parseMarkdownToTopic(rawText, title, category);
		self.postMessage({ id, ok: true, topic });
	} catch (error: unknown) {
		self.postMessage({
			id,
			ok: false,
			error:
				typeof error === "object" && error !== null && "message" in error
					? String((error as { message: unknown }).message)
					: "Parser worker error",
		});
	}
};
