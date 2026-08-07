export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResultItem[];
  provider: string;
  timestamp: string;
}

export interface GenerationProgress {
  stage: 'idle' | 'searching_web' | 'processing_llm' | 'streaming_llm' | 'validating' | 'complete' | 'error';
  message: string;
  progressPercentage: number;
  rawStreamText?: string;
}
