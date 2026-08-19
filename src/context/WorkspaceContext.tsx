import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import type { WebSearchResponse } from "../types/search.types";
import type { Topic } from "../types/topic.types";

export interface SearchHistoryItem {
	id: string;
	query: string;
	topic: Topic;
	searchResults: WebSearchResponse | null;
	timestamp: number;
}

export type SettingsTab = "general" | "llm" | "search" | "data" | "security";

const HISTORY_KEY = "ias_search_history_list";

interface WorkspaceCtx {
	sidebarOpen: boolean;
	setSidebarOpen: (v: boolean) => void;
	toggleSidebar: () => void;
	dark: boolean;
	toggleDark: () => void;
	newTopicCounter: number;
	startNewTopic: () => void;
	isSettingsOpen: boolean;
	settingsInitialTab: SettingsTab;
	openSettings: (tab?: SettingsTab) => void;
	closeSettings: () => void;
	searchHistory: SearchHistoryItem[];
	addToSearchHistory: (
		query: string,
		topic: Topic,
		results: WebSearchResponse | null,
	) => void;
	removeFromSearchHistory: (id: string) => void;
	pendingLoadHistoryItem: SearchHistoryItem | null;
	loadSearchHistoryItem: (item: SearchHistoryItem) => void;
	clearPendingLoadHistoryItem: () => void;
	categorySelectCounter: number;
	triggerCategorySelect: () => void;
}

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

function deduplicateSearchHistory(
	items: SearchHistoryItem[],
): SearchHistoryItem[] {
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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(() => {
		try {
			const saved = localStorage.getItem("ias_sidebar");
			return saved !== null ? saved === "open" : true;
		} catch {
			return true;
		}
	});

	const [dark, setDark] = useState(() => {
		try {
			const saved = localStorage.getItem("ias_dark");
			if (saved !== null) {
				return saved === "true";
			}
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		} catch {
			return false;
		}
	});

	const [newTopicCounter, setNewTopicCounter] = useState(0);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] =
		useState<SettingsTab>("general");

	const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
		() => {
			try {
				const saved =
					localStorage.getItem(HISTORY_KEY) ||
					sessionStorage.getItem(HISTORY_KEY);
				return saved ? deduplicateSearchHistory(JSON.parse(saved)) : [];
			} catch {
				return [];
			}
		},
	);

	const [pendingLoadHistoryItem, setPendingLoadHistoryItem] =
		useState<SearchHistoryItem | null>(null);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		try {
			localStorage.setItem("ias_dark", String(dark));
		} catch {}
	}, [dark]);

	useEffect(() => {
		try {
			localStorage.setItem("ias_sidebar", sidebarOpen ? "open" : "closed");
		} catch {}
	}, [sidebarOpen]);

	useEffect(() => {
		try {
			const deduped = deduplicateSearchHistory(searchHistory);
			localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
			sessionStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
		} catch {}
	}, [searchHistory]);

	const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
	const toggleDark = useCallback(() => setDark((v) => !v), []);
	const startNewTopic = useCallback(() => {
		setPendingLoadHistoryItem(null);
		setNewTopicCounter((c) => c + 1);
	}, []);
	const openSettings = useCallback((tab: SettingsTab = "general") => {
		setSettingsInitialTab(tab);
		setIsSettingsOpen(true);
		if (typeof window !== "undefined" && window.innerWidth < 1024) {
			setSidebarOpen(false);
		}
	}, []);
	const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

	const addToSearchHistory = useCallback(
		(query: string, topic: Topic, results: WebSearchResponse | null) => {
			if (!query.trim() && !topic.title) return;
			const q = query.trim() || topic.title;
			const itemId = topic.id || `search-${Date.now()}`;
			setSearchHistory((prev) => {
				const item: SearchHistoryItem = {
					id: itemId,
					query: q,
					topic,
					searchResults: results,
					timestamp: Date.now(),
				};
				const filtered = prev.filter(
					(h) =>
						h.query.toLowerCase() !== q.toLowerCase() &&
						h.id !== itemId &&
						h.topic?.id !== topic.id,
				);
				return [item, ...filtered].slice(0, 10);
			});
		},
		[],
	);

	const removeFromSearchHistory = useCallback((id: string) => {
		setSearchHistory((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const loadSearchHistoryItem = useCallback((item: SearchHistoryItem) => {
		setPendingLoadHistoryItem(item);
	}, []);

	const clearPendingLoadHistoryItem = useCallback(() => {
		setPendingLoadHistoryItem(null);
	}, []);

	const [categorySelectCounter, setCategorySelectCounter] = useState(0);

	const triggerCategorySelect = useCallback(() => {
		setCategorySelectCounter((c) => c + 1);
	}, []);

	return (
		<WorkspaceContext.Provider
			value={{
				sidebarOpen,
				setSidebarOpen,
				toggleSidebar,
				dark,
				toggleDark,
				newTopicCounter,
				startNewTopic,
				isSettingsOpen,
				settingsInitialTab,
				openSettings,
				closeSettings,
				searchHistory,
				addToSearchHistory,
				removeFromSearchHistory,
				pendingLoadHistoryItem,
				loadSearchHistoryItem,
				clearPendingLoadHistoryItem,
				categorySelectCounter,
				triggerCategorySelect,
			}}
		>
			{children}
		</WorkspaceContext.Provider>
	);
}

// biome-ignore lint/style/useComponentExportOnlyModules: context hook
export function useWorkspace(): WorkspaceCtx {
	const ctx = useContext(WorkspaceContext);
	if (!ctx)
		throw new Error("useWorkspace must be used inside WorkspaceProvider");
	return ctx;
}
