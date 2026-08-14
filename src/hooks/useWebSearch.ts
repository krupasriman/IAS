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

export function useWebSearch({ onSuccess }: UseWebSearchOptions = {}) {
	const { settings } = useSettings();
	const STORAGE_KEY = "ias_web_search_state";
	const HISTORY_KEY = "ias_search_history_list";

	const [query, setQuery] = useState<string>(() => {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw).query || "" : "";
		} catch {
			return "";
		}
	});

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
			const histRaw = sessionStorage.getItem(HISTORY_KEY);
			return histRaw ? JSON.parse(histRaw) : [];
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
			sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
		} catch {}
	}, [history]);

	const addToHistory = useCallback(
		(
			topicQuery: string,
			newTopic: Topic,
			newResults: WebSearchResponse | null,
		) => {
			setHistory((prev) => {
				const newItem: SearchHistoryItem = {
					id: newTopic.id,
					query: topicQuery,
					topic: newTopic,
					searchResults: newResults,
					timestamp: Date.now(),
				};
				// Remove if already exists with same query
				const filtered = prev.filter(
					(item) => item.query.toLowerCase() !== topicQuery.toLowerCase(),
				);
				return [newItem, ...filtered].slice(0, 6);
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
		setHistory((prev) => prev.filter((item) => item.id !== id));
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

	const reset = useCallback(() => {
		setQuery("");
		setSearchResults(null);
		setGeneratedTopic(null);
		setError(null);
		setProgress({ stage: "idle", message: "", progressPercentage: 0 });
		try {
			sessionStorage.removeItem(STORAGE_KEY);
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
		reset,
		loadFromHistory,
		removeFromHistory,
	};
}
