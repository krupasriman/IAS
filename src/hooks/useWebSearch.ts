import { useCallback, useState } from 'react';
import type { Topic } from '../types/topic.types';
import type { GenerationProgress, WebSearchResponse } from '../types/search.types';
import { useSettings } from '../context/SettingsContext';
import { webSearch } from '../services/search';
import { callLLM } from '../services/llm/client';
import { buildUserPrompt, IAS_SYSTEM_PROMPT } from '../utils/prompts';
import { parseMarkdownToTopic } from '../utils/parser';
import { validateTopic } from '../utils/validator';

interface UseWebSearchOptions {
  onSuccess?: (topic: Topic) => void;
}

export function useWebSearch({ onSuccess }: UseWebSearchOptions = {}) {
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WebSearchResponse | null>(null);
  const [generatedTopic, setGeneratedTopic] = useState<Topic | null>(null);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    message: '',
    progressPercentage: 0
  });
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (topicQuery: string, category?: string) => {
    if (!topicQuery.trim()) return;

    setQuery(topicQuery);
    setError(null);
    setGeneratedTopic(null);
    setSearchResults(null);

    // Step 1: Web search
    setProgress({ stage: 'searching_web', message: 'Searching the web...', progressPercentage: 15 });
    let results: WebSearchResponse | null = null;
    try {
      results = await webSearch(topicQuery, settings.search);
      setSearchResults(results);
    } catch (e: any) {
      console.warn('Web search failed, proceeding without results:', e);
    }

    // Step 2: LLM processing
    setProgress({ stage: 'processing_llm', message: 'Analyzing with LLM...', progressPercentage: 40 });

    const webContext = results?.results?.length
      ? results.results
          .slice(0, 6)
          .map(r => `- ${r.title}: ${r.snippet} [${r.url}]`)
          .join('\n')
      : '';

    const systemPrompt = IAS_SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(topicQuery, category, webContext);

    try {
      const rawOutput = await callLLM(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        settings.llm
      );

      console.log('[WebSearch] Raw LLM output:', rawOutput.slice(0, 500));

      // Check if the response looks like an error
      if (rawOutput.toLowerCase().includes('invalid api key') || 
          rawOutput.toLowerCase().includes('unauthorized') ||
          rawOutput.toLowerCase().includes('quota exceeded') ||
          rawOutput.toLowerCase().includes('rate limit') ||
          rawOutput.trim().length < 50) {
        throw new Error(`LLM returned error or empty response: ${rawOutput.slice(0, 200)}`);
      }

      // Step 3: Parse
      setProgress({ stage: 'processing_llm', message: 'Structuring output...', progressPercentage: 70 });
      const parsed = parseMarkdownToTopic(rawOutput, topicQuery, category as any);

      // Step 4: Validate
      const validation = validateTopic(parsed as Topic);
      setProgress({ stage: 'validating', message: 'Validating against IAS format...', progressPercentage: 90 });

      const topic: Topic = {
        ...(parsed as Topic),
        source: 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setGeneratedTopic(topic);
      setProgress({ stage: 'complete', message: 'Study note generated', progressPercentage: 100 });

      if (validation.isValid) {
        onSuccess?.(topic);
      }

      return { topic, validation, rawOutput };
    } catch (e: any) {
      console.error('LLM processing failed:', e);
      setProgress({ stage: 'error', message: 'LLM processing failed', progressPercentage: 100 });
      setError(e?.message || 'Failed to process with LLM. Check your API key in Settings.');
      return null;
    }
  }, [onSuccess, settings.llm, settings.search]);

  const reset = useCallback(() => {
    setQuery('');
    setSearchResults(null);
    setGeneratedTopic(null);
    setError(null);
    setProgress({ stage: 'idle', message: '', progressPercentage: 0 });
  }, []);

  return {
    query,
    searchResults,
    generatedTopic,
    progress,
    error,
    process,
    reset
  };
}