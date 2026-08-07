import { useCallback, useState, useEffect } from 'react';
import type { Topic } from '../types/topic.types';
import type { GenerationProgress, WebSearchResponse } from '../types/search.types';
import { useSettings } from '../context/SettingsContext';
import { webSearch } from '../services/search';
import { generateStructuredTopic } from '../services/llm/client';
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

  const STORAGE_KEY = 'ias_web_search_state';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.query) setQuery(saved.query);
        if (saved.searchResults) setSearchResults(saved.searchResults);
        if (saved.generatedTopic) setGeneratedTopic(saved.generatedTopic);
        if (saved.progress) setProgress(saved.progress);
        if (saved.error) setError(saved.error);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        query,
        searchResults,
        generatedTopic,
        progress,
        error
      }));
    } catch {
      // ignore
    }
  }, [query, searchResults, generatedTopic, progress, error]);

  const process = useCallback(async (topicQuery: string, category?: string) => {
    if (!topicQuery.trim()) return;

    setQuery(topicQuery);
    setError(null);
    setGeneratedTopic(null);
    setSearchResults(null);

    setProgress({ stage: 'searching_web', message: 'Searching the web...', progressPercentage: 15 });
    let results: WebSearchResponse | null = null;
    try {
      results = await webSearch(topicQuery, settings.search);
      setSearchResults(results);
    } catch (e: any) {
      console.warn('Web search failed, proceeding without results:', e);
    }

    setProgress({ stage: 'processing_llm', message: 'Generating study note...', progressPercentage: 50 });

    const webContext = results?.results?.length
      ? results.results
          .slice(0, 4)
          .map(r => `- ${r.title}: ${r.snippet} [${r.url}]`)
          .join('\n')
      : '';

    try {
      const topic = await generateStructuredTopic(
        { topic: topicQuery, category, webContext },
        settings.llm
      );

      const validation = validateTopic(topic);
      setProgress({ stage: 'validating', message: 'Validating against IAS format...', progressPercentage: 90 });

      setGeneratedTopic(topic);
      setProgress({ stage: 'complete', message: 'Study note generated', progressPercentage: 100 });

      if (validation.isValid) {
        onSuccess?.(topic);
      }

      return { topic, validation };
    } catch (e: any) {
      console.error('LLM processing failed:', e);
      setProgress({ stage: 'error', message: 'LLM processing failed', progressPercentage: 100 });
      setError(e?.message || 'Failed to process with LLM. Check your API key in Settings.');
      return null;
    }
  }, [onSuccess, settings.llm, settings.search]);

  const processLLMOnly = useCallback(async (topicQuery: string, category?: string) => {
    if (!topicQuery.trim()) return;

    setQuery(topicQuery);
    setError(null);
    setGeneratedTopic(null);
    setSearchResults(null);

    setProgress({ stage: 'processing_llm', message: 'Generating study note...', progressPercentage: 30 });

    try {
      const topic = await generateStructuredTopic(
        { topic: topicQuery, category, webContext: '' },
        settings.llm
      );

      const validation = validateTopic(topic);
      setProgress({ stage: 'validating', message: 'Validating against IAS format...', progressPercentage: 80 });

      setGeneratedTopic(topic);
      setProgress({ stage: 'complete', message: 'Study note generated', progressPercentage: 100 });

      return { topic, validation };
    } catch (e: any) {
      console.error('LLM processing failed:', e);
      setProgress({ stage: 'error', message: 'LLM processing failed', progressPercentage: 100 });
      setError(e?.message || 'Failed to process with LLM. Check your API key in Settings.');
      return null;
    }
  }, [settings.llm]);

  const reset = useCallback(() => {
    setQuery('');
    setSearchResults(null);
    setGeneratedTopic(null);
    setError(null);
    setProgress({ stage: 'idle', message: '', progressPercentage: 0 });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, [STORAGE_KEY]);

  return {
    query,
    searchResults,
    generatedTopic,
    progress,
    error,
    process,
    processLLMOnly,
    reset
  };
}