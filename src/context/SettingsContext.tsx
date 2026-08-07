import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { AppSettings, LLMProvider, SearchProvider } from '../types/settings.types';
import { LLM_PROVIDERS, SEARCH_PROVIDERS } from '../config/providers';
import { fetchOpenRouterModels, fetchGeneralComputeModels, type OpenRouterModelInfo, type GeneralComputeModelInfo } from '../services/llm/models';

const STORAGE_KEY = 'ias_settings';

const EMPTY_LLM_KEYS: Record<LLMProvider, string> = {
  openrouter: '',
  groq: '',
  generalcompute: ''
};

const EMPTY_SEARCH_KEYS: Record<SearchProvider, string> = {
  duckduckgo: '',
  serpapi: '',
  brave: '',
  tavily: '',
  langsearch: ''
};

const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'openrouter',
    apiKeys: EMPTY_LLM_KEYS,
    baseUrl: LLM_PROVIDERS[0].defaultBaseUrl,
    model: LLM_PROVIDERS[0].defaultModel,
    temperature: 0.3
  },
  search: {
    provider: 'duckduckgo',
    apiKeys: EMPTY_SEARCH_KEYS,
    maxResults: 8
  },
  theme: 'light',
  autoSaveWebNotes: false
};

interface SettingsContextValue {
  settings: AppSettings;
  llmConfigured: boolean;
  searchConfigured: boolean;
  currentLLMApiKey: string;
  currentSearchApiKey: string;
  openRouterModels: OpenRouterModelInfo[];
  openRouterLoading: boolean;
  openRouterError: string | null;
  generalComputeModels: GeneralComputeModelInfo[];
  generalComputeLoading: boolean;
  generalComputeError: string | null;
  refreshOpenRouterModels: (force?: boolean) => Promise<void>;
  refreshGeneralComputeModels: (force?: boolean) => Promise<void>;
  setLLMProvider: (provider: LLMProvider) => void;
  setLLMApiKey: (key: string) => void;
  setLLMModel: (model: string) => void;
  setLLMBaseUrl: (url: string) => void;
  setTemperature: (temp: number) => void;
  setSearchProvider: (provider: SearchProvider) => void;
  setSearchApiKey: (key: string) => void;
  setMaxResults: (n: number) => void;
  setTheme: (theme: AppSettings['theme']) => void;
  setAutoSaveWebNotes: (val: boolean) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old format if needed
      if (parsed.llm && typeof parsed.llm.apiKey === 'string') {
        parsed.llm.apiKeys = { ...EMPTY_LLM_KEYS, [parsed.llm.provider]: parsed.llm.apiKey };
        delete parsed.llm.apiKey;
      }
      if (parsed.search && typeof parsed.search.apiKey === 'string') {
        parsed.search.apiKeys = { ...EMPTY_SEARCH_KEYS, [parsed.search.provider]: parsed.search.apiKey };
        delete parsed.search.apiKey;
      }
      // Ensure all providers have keys
      parsed.llm.apiKeys = { ...EMPTY_LLM_KEYS, ...parsed.llm.apiKeys };
      parsed.search.apiKeys = { ...EMPTY_SEARCH_KEYS, ...parsed.search.apiKeys };
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelInfo[]>([]);
  const [openRouterLoading, setOpenRouterLoading] = useState<boolean>(false);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [generalComputeModels, setGeneralComputeModels] = useState<GeneralComputeModelInfo[]>([]);
  const [generalComputeLoading, setGeneralComputeLoading] = useState<boolean>(false);
  const [generalComputeError, setGeneralComputeError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  const currentLLMApiKey = settings.llm.apiKeys[settings.llm.provider] || '';
  const currentSearchApiKey = settings.search.apiKeys[settings.search.provider] || '';

  const refreshOpenRouterModels = useCallback(async (force = false) => {
    setOpenRouterLoading(true);
    setOpenRouterError(null);
    try {
      const models = await fetchOpenRouterModels(currentLLMApiKey, force);
      setOpenRouterModels(models);
    } catch (e: any) {
      setOpenRouterError(e?.message || 'Failed to fetch OpenRouter models');
    } finally {
      setOpenRouterLoading(false);
    }
  }, [currentLLMApiKey]);

  const refreshGeneralComputeModels = useCallback(async (force = false) => {
    setGeneralComputeLoading(true);
    setGeneralComputeError(null);
    try {
      const models = await fetchGeneralComputeModels(currentLLMApiKey, force);
      setGeneralComputeModels(models);
    } catch (e: any) {
      setGeneralComputeError(e?.message || 'Failed to fetch General Compute models');
    } finally {
      setGeneralComputeLoading(false);
    }
  }, [currentLLMApiKey]);

  useEffect(() => {
    if (settings.llm.provider === 'openrouter') {
      refreshOpenRouterModels();
    } else if (settings.llm.provider === 'generalcompute') {
      refreshGeneralComputeModels();
    }
  }, [settings.llm.provider, refreshOpenRouterModels, refreshGeneralComputeModels]);

  const patch = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const patchLLM = useCallback((partial: Partial<AppSettings['llm']>) => {
    setSettings(prev => ({ ...prev, llm: { ...prev.llm, ...partial } }));
  }, []);

  const patchSearch = useCallback((partial: Partial<AppSettings['search']>) => {
    setSettings(prev => ({ ...prev, search: { ...prev.search, ...partial } }));
  }, []);

  const value: SettingsContextValue = {
    settings,
    searchConfigured: settings.search.provider === 'duckduckgo' || settings.search.provider === 'langsearch' || !!currentSearchApiKey,
    llmConfigured: !!currentLLMApiKey,
    currentLLMApiKey,
    currentSearchApiKey,
    openRouterModels,
    openRouterLoading,
    openRouterError,
    generalComputeModels,
    generalComputeLoading,
    generalComputeError,
    refreshOpenRouterModels,
    refreshGeneralComputeModels,
    setLLMProvider: (provider) => {
      const providerInfo = LLM_PROVIDERS.find(p => p.id === provider);
      patchLLM({
        provider,
        baseUrl: providerInfo?.defaultBaseUrl ?? settings.llm.baseUrl,
        model: providerInfo?.defaultModel ?? settings.llm.model
      });
    },
    setLLMApiKey: (key) => patchLLM({ apiKeys: { ...settings.llm.apiKeys, [settings.llm.provider]: key } }),
    setLLMModel: (model) => patchLLM({ model }),
    setLLMBaseUrl: (url) => patchLLM({ baseUrl: url }),
    setTemperature: (temp) => patchLLM({ temperature: temp }),
    setSearchProvider: (provider) => {
      const searchInfo = SEARCH_PROVIDERS.find(p => p.id === provider);
      patchSearch({
        provider,
        maxResults: searchInfo?.requiredKey ? settings.search.maxResults : 8
      });
    },
    setSearchApiKey: (key) => patchSearch({ apiKeys: { ...settings.search.apiKeys, [settings.search.provider]: key } }),
    setMaxResults: (n) => patchSearch({ maxResults: n }),
    setTheme: (theme) => patch({ theme }),
    setAutoSaveWebNotes: (val) => patch({ autoSaveWebNotes: val }),
    resetSettings: () => setSettings(DEFAULT_SETTINGS)
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}

export { DEFAULT_SETTINGS };