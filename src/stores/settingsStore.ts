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
	generalcompute: "",
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

	// Clean out any previously saved default/placeholder keys
	for (const [k, v] of Object.entries(llmKeys)) {
		if (
			typeof v === "string" &&
			(v === "sk-..." ||
				v === "gsk_..." ||
				v.trim() === "" ||
				v.startsWith("gc_z8JDf4"))
		) {
			llmKeys[k] = "";
		}
	}

	llm.apiKeys = { ...EMPTY_LLM_KEYS, ...llmKeys };
	search.apiKeys = { ...EMPTY_SEARCH_KEYS, ...searchKeys };
	return parsed as unknown as AppSettings;
}

// Active startup scrubber to immediately clean all apiKeys from localStorage on boot
if (typeof window !== "undefined" && window.localStorage) {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			const state = (parsed.state ?? parsed) as Record<string, unknown>;
			const currentSettings = (state.settings ?? state) as Record<
				string,
				unknown
			>;
			const sanitized = migrate(currentSettings);
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					state: {
						settings: {
							...sanitized,
							llm: { ...sanitized.llm, apiKeys: EMPTY_LLM_KEYS },
							search: { ...sanitized.search, apiKeys: EMPTY_SEARCH_KEYS },
						},
					},
					version: 0,
				}),
			);
		}
	} catch {
		// ignore
	}
}

interface SettingsState {
	settings: AppSettings;

	setLLMProvider: (provider: LLMProvider) => void;
	setLLMApiKey: (key: string) => Promise<void>;
	setLLMApiKeyForProvider: (
		provider: LLMProvider,
		key: string,
	) => Promise<void>;
	setLLMModel: (model: string) => void;
	setLLMBaseUrl: (url: string) => void;
	setTemperature: (temp: number) => void;
	setSearchProvider: (provider: SearchProvider) => void;
	setSearchApiKey: (key: string) => Promise<void>;
	setSearchApiKeyForProvider: (
		provider: SearchProvider,
		key: string,
	) => Promise<void>;
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
						set((state) => ({
							serverKeys: {
								llm: Array.from(
									new Set([
										...state.serverKeys.llm,
										...(configured?.llm || []),
									]),
								),
								search: Array.from(
									new Set([
										...state.serverKeys.search,
										...(configured?.search || []),
									]),
								),
							},
						}));
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

			setLLMApiKey: async (key) => {
				const provider = get().settings.llm.provider;
				await get().setLLMApiKeyForProvider(provider, key);
			},

			setLLMApiKeyForProvider: async (provider, key) => {
				const trimmed = key.trim();
				if (!trimmed) {
					set((state) => ({
						settings: {
							...state.settings,
							llm: {
								...state.settings.llm,
								apiKeys: { ...state.settings.llm.apiKeys, [provider]: "" },
							},
						},
					}));
					return;
				}

				// Encrypt in server key vault; scrub cleartext key from in-memory state upon success
				try {
					await storeServerApiKey("llm", provider, trimmed);
					set((state) => ({
						serverKeys: {
							...state.serverKeys,
							llm: Array.from(new Set([...state.serverKeys.llm, provider])),
						},
						settings: {
							...state.settings,
							llm: {
								...state.settings.llm,
								apiKeys: { ...state.settings.llm.apiKeys, [provider]: "" },
							},
						},
					}));
				} catch (err) {
					set((state) => ({
						settings: {
							...state.settings,
							llm: {
								...state.settings.llm,
								apiKeys: {
									...state.settings.llm.apiKeys,
									[provider]: trimmed,
								},
							},
						},
					}));
					throw err;
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

			setSearchApiKey: async (key) => {
				const provider = get().settings.search.provider;
				await get().setSearchApiKeyForProvider(provider, key);
			},

			setSearchApiKeyForProvider: async (provider, key) => {
				const trimmed = key.trim();
				if (!trimmed) {
					set((state) => ({
						settings: {
							...state.settings,
							search: {
								...state.settings.search,
								apiKeys: {
									...state.settings.search.apiKeys,
									[provider]: "",
								},
							},
						},
					}));
					return;
				}

				// Encrypt in server key vault; scrub cleartext key from in-memory state upon success
				try {
					await storeServerApiKey("search", provider, trimmed);
					set((state) => ({
						serverKeys: {
							...state.serverKeys,
							search: Array.from(
								new Set([...state.serverKeys.search, provider]),
							),
						},
						settings: {
							...state.settings,
							search: {
								...state.settings.search,
								apiKeys: {
									...state.settings.search.apiKeys,
									[provider]: "",
								},
							},
						},
					}));
				} catch (err) {
					set((state) => ({
						settings: {
							...state.settings,
							search: {
								...state.settings.search,
								apiKeys: {
									...state.settings.search.apiKeys,
									[provider]: trimmed,
								},
							},
						},
					}));
					throw err;
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
			partialize: (state) => ({
				serverKeys: state.serverKeys,
				settings: {
					...state.settings,
					llm: {
						...state.settings.llm,
						apiKeys: EMPTY_LLM_KEYS,
					},
					search: {
						...state.settings.search,
						apiKeys: EMPTY_SEARCH_KEYS,
					},
				},
			}),
			merge: (persisted, current) => {
				if (!persisted) return current;
				const p = persisted as Record<string, unknown>;
				const pServerKeys = p.serverKeys as
					| { llm?: string[]; search?: string[] }
					| undefined;
				return {
					...current,
					serverKeys: {
						llm: Array.from(
							new Set([
								...(current.serverKeys?.llm || []),
								...(pServerKeys?.llm || []),
							]),
						),
						search: Array.from(
							new Set([
								...(current.serverKeys?.search || []),
								...(pServerKeys?.search || []),
							]),
						),
					},
					settings: migrate(
						(p.settings ?? persisted) as Record<string, unknown>,
					),
				};
			},
		},
	),
);

export const DEFAULT_APP_SETTINGS = DEFAULT_SETTINGS;
