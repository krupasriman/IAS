import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Topic, CategoryType } from '../types/topic.types';

const TOPICS_STORAGE_KEY = 'ias_topics';

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [initialTopics, setInitialTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromStorage = useCallback((): Topic[] | null => {
    try {
      const raw = localStorage.getItem(TOPICS_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Topic[];
    } catch (e) {
      console.error('Failed to load topics from storage', e);
    }
    return null;
  }, []);

  const saveToStorage = useCallback((items: Topic[]) => {
    try {
      localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save topics to storage', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Load initial topics from public/data/topics.json
    fetch('/data/topics.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load topics data');
        return res.json();
      })
      .then((seedTopics: Topic[]) => {
        if (!mounted) return;
        setInitialTopics(seedTopics);
        const stored = loadFromStorage();
        if (stored && stored.length > 0) {
          setTopics(stored);
        } else {
          setTopics(seedTopics);
          saveToStorage(seedTopics);
        }
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        console.error('Error loading seed topics:', err);
        const stored = loadFromStorage();
        if (stored && stored.length > 0) {
          setTopics(stored);
        }
        setError('Failed to load seed topics. Using local data only.');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [loadFromStorage, saveToStorage]);

  const addTopic = useCallback((topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Topic, 'id'>>): Topic => {
    const newTopic: Topic = {
      ...(topic as Topic),
      id: topic.id || generateId(topic.title),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTopics(prev => {
      const next = [newTopic, ...prev];
      saveToStorage(next);
      return next;
    });
    return newTopic;
  }, [saveToStorage]);

  const updateTopic = useCallback((id: string, updates: Partial<Topic>): boolean => {
    let found = false;
    setTopics(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          found = true;
          return { ...t, ...updates, id, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      if (found) saveToStorage(next);
      return next;
    });
    return found;
  }, [saveToStorage]);

  const deleteTopic = useCallback((id: string): boolean => {
    let found = false;
    setTopics(prev => {
      const next = prev.filter(t => {
        if (t.id === id) { found = true; return false; }
        return true;
      });
      if (found) saveToStorage(next);
      return next;
    });
    return found;
  }, [saveToStorage]);

  const getTopic = useCallback((id: string): Topic | undefined => {
    return topics.find(t => t.id === id);
  }, [topics]);

  const searchTopics = useCallback((query: string): Topic[] => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.meaning.toLowerCase().includes(q) ||
      (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
    );
  }, [topics]);

  const getByCategory = useCallback((category: CategoryType): Topic[] => {
    return topics.filter(t => t.category === category);
  }, [topics]);

  const resetToSeed = useCallback(() => {
    setTopics(initialTopics);
    saveToStorage(initialTopics);
  }, [initialTopics, saveToStorage]);

  const exportTopics = useCallback((): string => {
    return JSON.stringify(topics, null, 2);
  }, [topics]);

  const importTopics = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return false;
      setTopics(parsed);
      saveToStorage(parsed);
      return true;
    } catch (e) {
      console.error('Failed to import topics', e);
      return false;
    }
  }, [saveToStorage]);

  const stats = useMemo(() => ({
    total: topics.length,
    byCategory: topics.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {}),
    lastUpdated: topics.length > 0 ? topics[0].updatedAt : null,
    sourceBreakdown: topics.reduce<Record<string, number>>((acc, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1;
      return acc;
    }, {})
  }), [topics]);

  return {
    topics,
    loading,
    error,
    stats,
    addTopic,
    updateTopic,
    deleteTopic,
    getTopic,
    searchTopics,
    getByCategory,
    resetToSeed,
    exportTopics,
    importTopics
  };
}

function generateId(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base}-${Date.now().toString(36)}`;
}