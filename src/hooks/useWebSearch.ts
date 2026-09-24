import { useCallback, useEffect, useState } from "react";
import { streamStructuredTopic } from "../services/llm/client";
import { webSearch } from "../services/search";
import type {
	GenerationProgress,
	WebSearchResponse,
} from "../types/search.types";
import type { Topic } from "../types/topic.types";
import { validateTopicRelevance } from "../utils/topicGuardrail";
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

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);

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
					progress:
						progress.stage === "error"
							? { stage: "idle", message: "", progressPercentage: 0 }
							: progress,
				}),
			);
		} catch {
			// ignore
		}
	}, [query, searchResults, generatedTopic, progress]);

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

			const relevance = validateTopicRelevance(topicQuery);
			if (!relevance.isRelevant) {
				const reason =
					relevance.reason ||
					"This query is not a recognized UPSC / IAS study topic.";
				setError(reason);
				setProgress({
					stage: "error",
					message: "Off-topic query detected",
					progressPercentage: 100,
				});
				return null;
			}

			setLoading(true);
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
				const msg = e instanceof Error ? e.message : String(e);
				console.warn("Web search failed, proceeding without results:", msg);
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
				const topic = await streamStructuredTopic(
					{ topic: topicQuery, category, webContext },
					settings.llm,
					{
						onStatus: (stage, message) => {
							setProgress({
								stage: stage as GenerationProgress["stage"],
								message,
								progressPercentage: stage === "generating" ? 60 : 85,
							});
						},
						onChunk: (_chunk, accumulated) => {
							const dynamicPct = Math.min(
								90,
								55 + Math.floor(accumulated.length / 50),
							);
							setProgress((prev) => ({
								...prev,
								stage: "processing_llm",
								message: "Generating UPSC study note...",
								progressPercentage: dynamicPct,
							}));
						},
					},
				);

				const validation = validateTopic(topic);
				setProgress({
					stage: "validating",
					message: "Validating against IAS format...",
					progressPercentage: 95,
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
				const errMsg = e instanceof Error ? e.message : String(e);
				console.error("LLM processing failed:", errMsg);
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
			} finally {
				setLoading(false);
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

			const relevance = validateTopicRelevance(topicQuery);
			if (!relevance.isRelevant) {
				const reason =
					relevance.reason ||
					"This query is not a recognized UPSC / IAS study topic.";
				setError(reason);
				setProgress({
					stage: "error",
					message: "Off-topic query detected",
					progressPercentage: 100,
				});
				return null;
			}

			setLoading(true);
			setProgress({
				stage: "processing_llm",
				message: "Generating study note...",
				progressPercentage: 30,
			});

			try {
				const topic = await streamStructuredTopic(
					{ topic: topicQuery, category, webContext: "" },
					settings.llm,
					{
						onStatus: (stage, message) => {
							setProgress({
								stage: stage as GenerationProgress["stage"],
								message,
								progressPercentage: stage === "generating" ? 50 : 85,
							});
						},
						onChunk: (_chunk, accumulated) => {
							const dynamicPct = Math.min(
								90,
								35 + Math.floor(accumulated.length / 45),
							);
							setProgress((prev) => ({
								...prev,
								stage: "processing_llm",
								message: "Generating UPSC study note...",
								progressPercentage: dynamicPct,
							}));
						},
					},
				);

				const validation = validateTopic(topic);
				setProgress({
					stage: "validating",
					message: "Validating against IAS format...",
					progressPercentage: 95,
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
				const errMsg = e instanceof Error ? e.message : String(e);
				console.error("LLM processing failed:", errMsg);
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
			} finally {
				setLoading(false);
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
		setLoading(false);
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

	const clearError = useCallback(() => {
		setError(null);
		setProgress((prev) =>
			prev.stage === "error"
				? { stage: "idle", message: "", progressPercentage: 0 }
				: prev,
		);
	}, []);

	return {
		query,
		searchResults,
		generatedTopic,
		progress,
		error,
		loading,
		clearError,
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
