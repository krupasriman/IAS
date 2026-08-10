import type { CategoryType, Topic } from "../types/topic.types";
import { parseMarkdownToTopic } from "./parser";

let worker: Worker | null = null;
let pending = 0;

function getWorker(): Worker | null {
	if (typeof window === "undefined") return null;
	try {
		worker ??= new Worker(new URL("./parser.worker.ts", import.meta.url), {
			type: "module",
		});
		return worker;
	} catch {
		return null;
	}
}

export function parseMarkdownToTopicAsync(
	rawText: string,
	title: string,
	category: CategoryType = "Polity",
): Promise<Partial<Topic>> {
	const w = getWorker();
	if (!w) {
		return Promise.resolve(parseMarkdownToTopic(rawText, title, category));
	}

	return new Promise((resolve, reject) => {
		const id = `parse-${Date.now()}-${pending++}`;
		const onMessage = (event: MessageEvent) => {
			if (event.data?.id !== id) return;
			w.removeEventListener("message", onMessage);
			w.removeEventListener("error", onError);
			if (event.data.ok) {
				resolve(event.data.topic as Partial<Topic>);
			} else {
				reject(new Error(event.data.error || "Parser worker failed"));
			}
		};
		const onError = (event: ErrorEvent) => {
			w.removeEventListener("message", onMessage);
			w.removeEventListener("error", onError);
			reject(new Error(event.message || "Parser worker error"));
		};
		w.addEventListener("message", onMessage);
		w.addEventListener("error", onError);
		w.postMessage({ id, rawText, title, category });
	});
}
