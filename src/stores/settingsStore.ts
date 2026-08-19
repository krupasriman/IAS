import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LLM_PROVIDERS, SEARCH_PROVIDERS } from "../config/providers";
import {
	fetchConfiguredKeys,
	storeServerApiKey,
} from "../services/settingsApi";
import type {
	AppSettings,
	LLMProvider,
	SearchProvider,
} from "../types/settings.types";

const STORAGE_KEY = "ias_settings";

const EMPTY_LLM_KEYS: Record<LLMProvider, string> = {
	openrouter: "",
	groq: "",
	generalcompute: "gc_z8JDf42M5wo1KZ0-xkaZ3zEhxnR-RP1I",
};

const EMPTY_SEARCH_KEYS: Record<SearchProvider, string> = {
	duckduckgo: "",
	serpapi: "",
	brave: "",
	tavily: "",
	langsearch: "",
};

const DEFAULT_SETTINGS: AppSettings = {
	llm: {
		provider: "generalcompute",
		apiKeys: EMPTY_LLM_KEYS,
		baseUrl: "https://api.generalcompute.com/v1",
		model: "gpt-oss-120b",
		temperature: 0.3,
	},
	search: {
		provider: "duckduckgo",
		apiKeys: EMPTY_SEARCH_KEYS,
		maxResults: 8,
	},
	theme: "light",
	autoSaveWebNotes: false,
};

function migrate(parsed: Record<string, unknown>): AppSettings {
	const llm = (parsed.llm ?? {}) as Record<string, unknown>;
	const search = (parsed.search ?? {}) as Record<string, unknown>;

	if (llm && typeof llm.apiKey === "string") {
		llm.apiKeys = {
			...EMPTY_LLM_KEYS,
			[String(llm.provider ?? "")]: llm.apiKey,
		};
		delete llm.apiKey;
	}
	if (search && typeof search.apiKey === "string") {
		search.apiKeys = {
			...EMPTY_SEARCH_KEYS,
			[String(search.provider ?? "")]: search.apiKey,
		};
		delete search.apiKey;
	}
	const llmKeys = (llm.apiKeys ?? {}) as Record<string, unknown>;
	const searchKeys = (search.apiKeys ?? {}) as Record<string, unknown>;
	llm.apiKeys = { ...EMPTY_LLM_KEYS, ...llmKeys };
	search.apiKeys = { ...EMPTY_SEARCH_KEYS, ...searchKeys };
	return parsed as unknown as AppSettings;
}

interface SettingsState {
	settings: AppSettings;

	setLLMProvider: (provider: LLMProvider) => void;
	setLLMApiKey: (key: string) => void;
	setLLMModel: (model: string) => void;
	setLLMBaseUrl: (url: string) => void;
	setTemperature: (temp: number) => void;
	setSearchProvider: (provider: SearchProvider) => void;
	setSearchApiKey: (key: string) => void;
	setMaxResults: (n: number) => void;
	setTheme: (theme: AppSettings["theme"]) => void;
	setAutoSaveWebNotes: (val: boolean) => void;
	resetSettings: () => void;

	serverKeys: { llm: string[]; search: string[] };
	loadServerKeys: () => Promise<void>;
	clearServerKey: (kind: "llm" | "search", provider: string) => void;
}

let inFlightLoad: Promise<void> | null = null;
let lastLoadedTime = 0;
const LOAD_THROTTLE_MS = 30000; // 30 seconds

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set, get) => ({
			settings: DEFAULT_SETTINGS,
			serverKeys: { llm: [], search: [] },

			loadServerKeys: async () => {
				const now = Date.now();
				if (inFlightLoad) return inFlightLoad;
				if (now - lastLoadedTime < LOAD_THROTTLE_MS) return;

				inFlightLoad = (async () => {
					try {
						const configured = await fetchConfiguredKeys();
						set({ serverKeys: configured });
						lastLoadedTime = Date.now();
					} catch {
						// Server unreachable or auth required; keep local keys
					} finally {
						inFlightLoad = null;
					}
				})();

				return inFlightLoad;
			},

			clearServerKey: (kind, provider) => {
				set((state) => ({
					serverKeys: {
						...state.serverKeys,
						[kind]: state.serverKeys[kind].filter((p) => p !== provider),
					},
				}));
			},

			setLLMProvider: (provider) => {
				const providerInfo = LLM_PROVIDERS.find((p) => p.id === provider);
				set((state) => ({
					settings: {
						...state.settings,
						llm: {
							...state.settings.llm,
							provider,
							baseUrl:
								providerInfo?.defaultBaseUrl ?? state.settings.llm.baseUrl,
							model: providerInfo?.defaultModel ?? state.settings.llm.model,
						},
					},
				}));
			},

			setLLMApiKey: (key) => {
				const provider = get().settings.llm.provider;
				set((state) => ({
					settings: {
						...state.settings,
						llm: {
							...state.settings.llm,
							apiKeys: { ...state.settings.llm.apiKeys, [provider]: key },
						},
					},
				}));
				if (key) {
					storeServerApiKey("llm", provider, key).catch(() => {
						// ignore sync failures; local key remains usable
					});
				}
			},

			setLLMModel: (model) => {
				set((state) => ({
					settings: {
						...state.settings,
						llm: { ...state.settings.llm, model },
					},
				}));
			},

			setLLMBaseUrl: (url) => {
				set((state) => ({
					settings: {
						...state.settings,
						llm: { ...state.settings.llm, baseUrl: url },
					},
				}));
			},

			setTemperature: (temp) => {
				set((state) => ({
					settings: {
						...state.settings,
						llm: { ...state.settings.llm, temperature: temp },
					},
				}));
			},

			setSearchProvider: (provider) => {
				const searchInfo = SEARCH_PROVIDERS.find((p) => p.id === provider);
				set((state) => ({
					settings: {
						...state.settings,
						search: {
							...state.settings.search,
							provider,
							maxResults: searchInfo?.requiredKey
								? state.settings.search.maxResults
								: 8,
						},
					},
				}));
			},

			setSearchApiKey: (key) => {
				const provider = get().settings.search.provider;
				set((state) => ({
					settings: {
						...state.settings,
						search: {
							...state.settings.search,
							apiKeys: { ...state.settings.search.apiKeys, [provider]: key },
						},
					},
				}));
				if (key) {
					storeServerApiKey("search", provider, key).catch(() => {
						// ignore sync failures; local key remains usable
					});
				}
			},

			setMaxResults: (n) => {
				set((state) => ({
					settings: {
						...state.settings,
						search: { ...state.settings.search, maxResults: n },
					},
				}));
			},

			setTheme: (theme) => {
				set((state) => ({ settings: { ...state.settings, theme } }));
			},

			setAutoSaveWebNotes: (val) => {
				set((state) => ({
					settings: { ...state.settings, autoSaveWebNotes: val },
				}));
			},

			resetSettings: () => {
				set({ settings: DEFAULT_SETTINGS });
			},
		}),
		{
			name: STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({ settings: state.settings }),
			merge: (persisted, current) => {
				if (!persisted) return current;
				return {
					...current,
					settings: migrate(
						((persisted as Record<string, unknown>).settings ??
							persisted) as Record<string, unknown>,
					),
				};
			},
		},
	),
);

export const DEFAULT_APP_SETTINGS = DEFAULT_SETTINGS;
