import { useCallback, useEffect, useState } from "react";
import { generateStructuredTopic } from "../services/llm/client";
import { webSearch } from "../services/search";
import type {
	GenerationProgress,
	WebSearchResponse,
} from "../types/search.types";
import type { Topic } from "../types/topic.types";
import { validateTopic } from "../utils/validator";
import { useSettings } from "./useSettings";

export interface SearchHistoryItem {
	id: string;
	query: string;
	topic: Topic;
	searchResults: WebSearchResponse | null;
	timestamp: number;
}

interface UseWebSearchOptions {
	onSuccess?: (topic: Topic) => void;
}

function deduplicateHistory(items: SearchHistoryItem[]): SearchHistoryItem[] {
	const seenIds = new Set<string>();
	const seenQueries = new Set<string>();
	const result: SearchHistoryItem[] = [];
	for (const item of items) {
		const qKey = item.query?.trim().toLowerCase();
		const idKey = item.id || item.topic?.id;
		if (idKey && seenIds.has(idKey)) continue;
		if (qKey && seenQueries.has(qKey)) continue;
		if (idKey) seenIds.add(idKey);
		if (qKey) seenQueries.add(qKey);
		result.push(item);
	}
	return result;
}

export function useWebSearch({ onSuccess }: UseWebSearchOptions = {}) {
	const { settings } = useSettings();
	const STORAGE_KEY = "ias_web_search_state";
	const HISTORY_KEY = "ias_search_history_list";

	const [query, setQuery] = useState<string>("");

	const [searchResults, setSearchResults] = useState<WebSearchResponse | null>(
		() => {
			try {
				const raw = sessionStorage.getItem(STORAGE_KEY);
				return raw ? JSON.parse(raw).searchResults || null : null;
			} catch {
				return null;
			}
		},
	);

	const [generatedTopic, setGeneratedTopic] = useState<Topic | null>(() => {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw).generatedTopic || null : null;
		} catch {
			return null;
		}
	});

	const [progress, setProgress] = useState<GenerationProgress>(() => {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			return raw
				? JSON.parse(raw).progress || {
						stage: "idle",
						message: "",
						progressPercentage: 0,
					}
				: { stage: "idle", message: "", progressPercentage: 0 };
		} catch {
			return { stage: "idle", message: "", progressPercentage: 0 };
		}
	});

	const [error, setError] = useState<string | null>(() => {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw).error || null : null;
		} catch {
			return null;
		}
	});

	const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
		try {
			const histRaw =
				localStorage.getItem(HISTORY_KEY) ||
				sessionStorage.getItem(HISTORY_KEY);
			return histRaw ? deduplicateHistory(JSON.parse(histRaw)) : [];
		} catch {
			return [];
		}
	});

	useEffect(() => {
		try {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					query,
					searchResults,
					generatedTopic,
					progress,
					error,
				}),
			);
		} catch {
			// ignore
		}
	}, [query, searchResults, generatedTopic, progress, error]);

	useEffect(() => {
		try {
			const deduped = deduplicateHistory(history);
			localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
			sessionStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
		} catch {}
	}, [history]);

	const addToHistory = useCallback(
		(
			topicQuery: string,
			newTopic: Topic,
			newResults: WebSearchResponse | null,
		) => {
			const itemId = newTopic.id || `search-${Date.now()}`;
			const newItem: SearchHistoryItem = {
				id: itemId,
				query: topicQuery,
				topic: newTopic,
				searchResults: newResults,
				timestamp: Date.now(),
			};
			setHistory((prev) => {
				const filtered = prev.filter(
					(item) =>
						item.query.toLowerCase() !== topicQuery.toLowerCase() &&
						item.id !== itemId &&
						item.topic?.id !== newTopic.id,
				);
				const updated = [newItem, ...filtered].slice(0, 10);
				return updated;
			});
		},
		[],
	);

	const loadFromHistory = useCallback((item: SearchHistoryItem) => {
		setQuery(item.query);
		setGeneratedTopic(item.topic);
		setSearchResults(item.searchResults);
		setError(null);
		setProgress({
			stage: "complete",
			message: "Loaded from history",
			progressPercentage: 100,
		});
	}, []);

	const removeFromHistory = useCallback((id: string) => {
		setHistory((prev) => {
			const updated = prev.filter((item) => item.id !== id);
			try {
				localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
				sessionStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
			} catch {}
			return updated;
		});
	}, []);

	const process = useCallback(
		async (topicQuery: string, category?: string) => {
			if (!topicQuery.trim()) return;

			setQuery(topicQuery);
			setError(null);
			setGeneratedTopic(null);
			setSearchResults(null);

			setProgress({
				stage: "searching_web",
				message: "Searching the web...",
				progressPercentage: 15,
			});
			let results: WebSearchResponse | null = null;
			try {
				results = await webSearch(topicQuery, settings.search);
				setSearchResults(results);
			} catch (e: unknown) {
				console.warn("Web search failed, proceeding without results:", e);
			}

			setProgress({
				stage: "processing_llm",
				message: "Generating study note...",
				progressPercentage: 50,
			});

			const webContext = results?.results?.length
				? results.results
						.slice(0, 4)
						.map((r) => `- ${r.title}: ${r.snippet} [${r.url}]`)
						.join("\n")
				: "";

			try {
				const topic = await generateStructuredTopic(
					{ topic: topicQuery, category, webContext },
					settings.llm,
				);

				const validation = validateTopic(topic);
				setProgress({
					stage: "validating",
					message: "Validating against IAS format...",
					progressPercentage: 90,
				});

				setGeneratedTopic(topic);
				addToHistory(topicQuery, topic, results);
				setProgress({
					stage: "complete",
					message: "Study note generated",
					progressPercentage: 100,
				});

				if (validation.isValid) {
					onSuccess?.(topic);
				}

				return { topic, validation };
			} catch (e: unknown) {
				console.error("LLM processing failed:", e);
				setProgress({
					stage: "error",
					message: "LLM processing failed",
					progressPercentage: 100,
				});
				setError(
					typeof e === "object" && e !== null && "message" in e
						? String((e as { message: unknown }).message)
						: "Failed to process with LLM. Check your API key in Settings.",
				);
				return null;
			}
		},
		[onSuccess, settings.llm, settings.search, addToHistory],
	);

	const processLLMOnly = useCallback(
		async (topicQuery: string, category?: string) => {
			if (!topicQuery.trim()) return;

			setQuery(topicQuery);
			setError(null);
			setGeneratedTopic(null);
			setSearchResults(null);

			setProgress({
				stage: "processing_llm",
				message: "Generating study note...",
				progressPercentage: 30,
			});

			try {
				const topic = await generateStructuredTopic(
					{ topic: topicQuery, category, webContext: "" },
					settings.llm,
				);

				const validation = validateTopic(topic);
				setProgress({
					stage: "validating",
					message: "Validating against IAS format...",
					progressPercentage: 80,
				});

				setGeneratedTopic(topic);
				addToHistory(topicQuery, topic, null);
				setProgress({
					stage: "complete",
					message: "Study note generated",
					progressPercentage: 100,
				});

				return { topic, validation };
			} catch (e: unknown) {
				console.error("LLM processing failed:", e);
				setProgress({
					stage: "error",
					message: "LLM processing failed",
					progressPercentage: 100,
				});
				setError(
					typeof e === "object" && e !== null && "message" in e
						? String((e as { message: unknown }).message)
						: "Failed to process with LLM. Check your API key in Settings.",
				);
				return null;
			}
		},
		[settings.llm, addToHistory],
	);

	const updateTopicCategory = useCallback((category: string) => {
		setGeneratedTopic((prev) =>
			prev ? { ...prev, category: category as Topic["category"] } : null,
		);
	}, []);

	const reset = useCallback(() => {
		setQuery("");
		setSearchResults(null);
		setGeneratedTopic(null);
		setError(null);
		setProgress({ stage: "idle", message: "", progressPercentage: 0 });
		try {
			sessionStorage.removeItem(STORAGE_KEY);
			localStorage.removeItem(STORAGE_KEY);
		} catch {}
	}, []);

	return {
		query,
		searchResults,
		generatedTopic,
		progress,
		error,
		history,
		addToHistory,
		process,
		processLLMOnly,
		updateTopicCategory,
		reset,
		loadFromHistory,
		removeFromHistory,
	};
}
