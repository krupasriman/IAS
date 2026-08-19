import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
	DEFAULT_GENERAL_COMPUTE_MODELS,
	DEFAULT_OPENROUTER_MODELS,
	fetchGeneralComputeModels,
	fetchOpenRouterModels,
	type GeneralComputeModelInfo,
	type OpenRouterModelInfo,
} from "../services/llm/models";
import { useSettingsStore } from "../stores/settingsStore";

const CACHE_TTL = 1000 * 60 * 60; // 1 hour (matches fetch cache TTL)

export function useProviderModels() {
	const apiKeys = useSettingsStore((s) => s.settings.llm.apiKeys);
	const provider = useSettingsStore((s) => s.settings.llm.provider);
	const [openRouterNonce, setOpenRouterNonce] = useState(0);
	const [generalComputeNonce, setGeneralComputeNonce] = useState(0);

	const openRouterQuery = useQuery({
		queryKey: ["openrouter-models", apiKeys.openrouter, openRouterNonce],
		queryFn: () =>
			fetchOpenRouterModels(apiKeys.openrouter, openRouterNonce > 0),
		staleTime: CACHE_TTL,
		enabled: provider === "openrouter",
	});

	const generalComputeQuery = useQuery({
		queryKey: [
			"generalcompute-models",
			apiKeys.generalcompute,
			generalComputeNonce,
		],
		queryFn: () =>
			fetchGeneralComputeModels(
				apiKeys.generalcompute,
				generalComputeNonce > 0,
			),
		staleTime: CACHE_TTL,
		enabled: provider === "generalcompute",
	});

	const refreshOpenRouterModels = useCallback((_force?: boolean) => {
		setOpenRouterNonce((n) => n + 1);
	}, []);

	const refreshGeneralComputeModels = useCallback((_force?: boolean) => {
		setGeneralComputeNonce((n) => n + 1);
	}, []);

	const openRouterData = openRouterQuery.data;
	const generalComputeData = generalComputeQuery.data;

	return {
		openRouterModels: (openRouterData && openRouterData.length > 0
			? openRouterData
			: DEFAULT_OPENROUTER_MODELS) as OpenRouterModelInfo[],
		openRouterLoading: openRouterQuery.isFetching,
		openRouterError: openRouterQuery.isError
			? (openRouterQuery.error as Error).message
			: null,
		generalComputeModels: (generalComputeData && generalComputeData.length > 0
			? generalComputeData
			: DEFAULT_GENERAL_COMPUTE_MODELS) as GeneralComputeModelInfo[],
		generalComputeLoading: generalComputeQuery.isFetching,
		generalComputeError: generalComputeQuery.isError
			? (generalComputeQuery.error as Error).message
			: null,
		refreshOpenRouterModels,
		refreshGeneralComputeModels,
	};
}
