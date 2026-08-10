import { useEffect, useMemo } from "react";
import { useSettingsStore } from "../stores/settingsStore";
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
	const setLLMModel = useSettingsStore((s) => s.setLLMModel);
	const setLLMBaseUrl = useSettingsStore((s) => s.setLLMBaseUrl);
	const setTemperature = useSettingsStore((s) => s.setTemperature);
	const setSearchProvider = useSettingsStore((s) => s.setSearchProvider);
	const setSearchApiKey = useSettingsStore((s) => s.setSearchApiKey);
	const setMaxResults = useSettingsStore((s) => s.setMaxResults);
	const setTheme = useSettingsStore((s) => s.setTheme);
	const setAutoSaveWebNotes = useSettingsStore((s) => s.setAutoSaveWebNotes);
	const resetSettings = useSettingsStore((s) => s.resetSettings);

	const currentLLMApiKey = settings.llm.apiKeys[settings.llm.provider] || "";
	const currentSearchApiKey =
		settings.search.apiKeys[settings.search.provider] || "";

	const llmConfigured = useMemo(
		() => !!currentLLMApiKey || serverKeys.llm.includes(settings.llm.provider),
		[currentLLMApiKey, serverKeys.llm, settings.llm.provider],
	);
	const searchConfigured = useMemo(
		() =>
			settings.search.provider === "duckduckgo" ||
			settings.search.provider === "langsearch" ||
			!!currentSearchApiKey ||
			serverKeys.search.includes(settings.search.provider),
		[settings.search.provider, currentSearchApiKey, serverKeys.search],
	);

	useEffect(() => {
		void loadServerKeys();
	}, [loadServerKeys]);

	return {
		settings,
		llmConfigured,
		searchConfigured,
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
		setLLMModel,
		setLLMBaseUrl,
		setTemperature,
		setSearchProvider,
		setSearchApiKey,
		setMaxResults,
		setTheme,
		setAutoSaveWebNotes,
		resetSettings,
	};
}
