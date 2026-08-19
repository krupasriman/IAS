import { useCallback, useEffect, useMemo } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { LLMProvider, SearchProvider } from "../types/settings.types";
import { validateApiKeyFormat } from "../utils/apiKeyValidator";
import { useProviderModels } from "./useProviderModels";

export function useSettings() {
	const settings = useSettingsStore((s) => s.settings);
	const serverKeys = useSettingsStore((s) => s.serverKeys);
	const loadServerKeys = useSettingsStore((s) => s.loadServerKeys);

	const {
		openRouterModels,
		openRouterLoading,
		openRouterError,
		generalComputeModels,
		generalComputeLoading,
		generalComputeError,
		refreshOpenRouterModels,
		refreshGeneralComputeModels,
	} = useProviderModels();

	const setLLMProvider = useSettingsStore((s) => s.setLLMProvider);
	const setLLMApiKey = useSettingsStore((s) => s.setLLMApiKey);
	const setLLMApiKeyForProvider = useSettingsStore(
		(s) => s.setLLMApiKeyForProvider,
	);
	const setLLMModel = useSettingsStore((s) => s.setLLMModel);
	const setLLMBaseUrl = useSettingsStore((s) => s.setLLMBaseUrl);
	const setTemperature = useSettingsStore((s) => s.setTemperature);
	const setSearchProvider = useSettingsStore((s) => s.setSearchProvider);
	const setSearchApiKey = useSettingsStore((s) => s.setSearchApiKey);
	const setSearchApiKeyForProvider = useSettingsStore(
		(s) => s.setSearchApiKeyForProvider,
	);
	const setMaxResults = useSettingsStore((s) => s.setMaxResults);
	const setTheme = useSettingsStore((s) => s.setTheme);
	const setAutoSaveWebNotes = useSettingsStore((s) => s.setAutoSaveWebNotes);
	const resetSettings = useSettingsStore((s) => s.resetSettings);

	const isLlmProviderConfigured = useCallback(
		(provider: LLMProvider) => {
			const key = (settings.llm.apiKeys[provider] || "").trim();
			const isValidKey =
				Boolean(key) && validateApiKeyFormat(provider, key).isValid;
			return isValidKey || serverKeys.llm.includes(provider);
		},
		[settings.llm.apiKeys, serverKeys.llm],
	);

	const isSearchProviderConfigured = useCallback(
		(provider: SearchProvider) => {
			if (provider === "duckduckgo" || provider === "langsearch") return true;
			const key = (settings.search.apiKeys[provider] || "").trim();
			const isValidKey =
				Boolean(key) && validateApiKeyFormat(provider, key).isValid;
			return isValidKey || serverKeys.search.includes(provider);
		},
		[settings.search.apiKeys, serverKeys.search],
	);

	const llmConfigured = useMemo(
		() => isLlmProviderConfigured(settings.llm.provider),
		[isLlmProviderConfigured, settings.llm.provider],
	);
	const searchConfigured = useMemo(
		() => isSearchProviderConfigured(settings.search.provider),
		[isSearchProviderConfigured, settings.search.provider],
	);

	useEffect(() => {
		void loadServerKeys();
	}, [loadServerKeys]);

	const currentLLMApiKey = settings.llm.apiKeys[settings.llm.provider] || "";
	const currentSearchApiKey =
		settings.search.apiKeys[settings.search.provider] || "";

	return {
		settings,
		llmConfigured,
		searchConfigured,
		isLlmProviderConfigured,
		isSearchProviderConfigured,
		currentLLMApiKey,
		currentSearchApiKey,
		serverKeys,
		loadServerKeys,
		openRouterModels,
		openRouterLoading,
		openRouterError,
		generalComputeModels,
		generalComputeLoading,
		generalComputeError,
		refreshOpenRouterModels,
		refreshGeneralComputeModels,
		setLLMProvider,
		setLLMApiKey,
		setLLMApiKeyForProvider,
		setLLMModel,
		setLLMBaseUrl,
		setTemperature,
		setSearchProvider,
		setSearchApiKey,
		setSearchApiKeyForProvider,
		setMaxResults,
		setTheme,
		setAutoSaveWebNotes,
		resetSettings,
	};
}
