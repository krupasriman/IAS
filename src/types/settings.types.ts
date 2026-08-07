export type LLMProvider = 
  | 'openrouter'
  | 'groq'
  | 'generalcompute';

export type SearchProvider = 
  | 'duckduckgo'
  | 'serpapi'
  | 'brave'
  | 'tavily'
  | 'langsearch';

export interface LLMSettings {
  provider: LLMProvider;
  apiKeys: Record<LLMProvider, string>;
  baseUrl: string;
  model: string;
  temperature: number;
}

export interface SearchSettings {
  provider: SearchProvider;
  apiKeys: Record<SearchProvider, string>;
  maxResults: number;
}

export interface AppSettings {
  llm: LLMSettings;
  search: SearchSettings;
  theme: 'light' | 'dark' | 'system';
  autoSaveWebNotes: boolean;
}
