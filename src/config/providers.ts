import type { LLMProvider, SearchProvider } from '../types/settings.types';

export interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: string[];
  apiKeyUrl: string;
  description: string;
  requiresKey: boolean;
}

export const LLM_PROVIDERS: LLMProviderInfo[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    models: [], // Models are fetched dynamically live from OpenRouter API
    apiKeyUrl: 'https://openrouter.ai/keys',
    description: '300+ models fetched live directly from OpenRouter API. Many free models available.',
    requiresKey: true
  },
  {
    id: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'deepseek-r1-distill-llama-70b'
    ],
    apiKeyUrl: 'https://console.groq.com/keys',
    description: 'Fast inference on LPUs. Free tier: 1,000 requests/day.',
    requiresKey: true
  },
  {
    id: 'generalcompute',
    name: 'General Compute',
    defaultBaseUrl: 'https://api.generalcompute.com/v1',
    defaultModel: 'gpt-oss-120b',
    models: [], // Models are fetched dynamically live from General Compute API
    apiKeyUrl: 'https://docs.generalcompute.com/api-keys',
    description: 'ASIC-powered inference, 1000+ tokens/sec. $100 free credit on signup.',
    requiresKey: true
  }
];

export interface SearchProviderInfo {
  id: SearchProvider;
  name: string;
  requiredKey: boolean;
  apiKeyUrl?: string;
  description: string;
  defaultEnabled: boolean;
}

export const SEARCH_PROVIDERS: SearchProviderInfo[] = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo (Free, no key)',
    requiredKey: false,
    description: 'Completely free web search. No API key needed. Limited depth.',
    defaultEnabled: true
  },
  {
    id: 'serpapi',
    name: 'SerpAPI (Google Search)',
    requiredKey: true,
    apiKeyUrl: 'https://serpapi.com/manage-api-key',
    description: 'Google search results. 100 free searches/month.',
    defaultEnabled: false
  },
  {
    id: 'brave',
    name: 'Brave Search',
    requiredKey: true,
    apiKeyUrl: 'https://brave.com/search/api/',
    description: 'Independent search index. 2,000 free queries/month.',
    defaultEnabled: false
  },
  {
    id: 'tavily',
    name: 'Tavily',
    requiredKey: true,
    apiKeyUrl: 'https://app.tavily.com/',
    description: 'AI-optimized search. 1,000 free credits/month.',
    defaultEnabled: false
  },
  {
    id: 'langsearch',
    name: 'LangSearch',
    requiredKey: false,
    description: 'Free semantic search API. No credit card required.',
    defaultEnabled: false
  }
];