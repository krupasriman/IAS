import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Sparkles, PlusCircle, Loader2, AlertCircle, Globe, Save, CheckCircle2,
  BookOpen, ExternalLink, RotateCcw
} from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import { useWebSearch } from '../hooks/useWebSearch';
import { useSettings } from '../context/SettingsContext';
import SearchBar from '../components/SearchBar';
import TopicCard from '../components/TopicCard';
import { CATEGORIES } from '../data/categories';
import type { CategoryType } from '../types/topic.types';
import TopicDetail from '../components/TopicDetail';

export default function HomePage() {
  const { topics, loading, addTopic } = useTopics();
  const { llmConfigured } = useSettings();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | CategoryType>('All');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [savedFromWeb, setSavedFromWeb] = useState(false);

  const webSearch = useWebSearch({
    onSuccess: () => {
      // Only auto-save if configured
      // We'll let the user choose via "Save to Notes"
    }
  });

  // Filter topics
  const filteredTopics = topics.filter(topic => {
    if (activeCategory !== 'All' && topic.category !== activeCategory) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!topic.title.toLowerCase().includes(q) &&
          !topic.meaning.toLowerCase().includes(q) &&
          !(topic.tags ?? []).some(tag => tag.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const handleSearch = (q: string, webEnabled: boolean) => {
    setQuery(q);
    if (webEnabled && llmConfigured) {
      webSearch.process(q, activeCategory !== 'All' ? activeCategory : undefined);
    }
  };

  const handleSaveFromWeb = () => {
    if (webSearch.generatedTopic) {
      addTopic(webSearch.generatedTopic);
      setSavedFromWeb(true);
      setTimeout(() => setSavedFromWeb(false), 2000);
      webSearch.reset();
      setWebSearchEnabled(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
          IAS Study Notes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Generator</span>
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Search any UPSC topic — get a structured analysis with Meaning, Quote, Pros & Cons, Way Forward, and Conclusion.
          Enable <span className="font-semibold text-blue-600">AI Search</span> for web + LLM-powered analysis.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={(enabled) => {
          setWebSearchEnabled(enabled);
          if (enabled && query.trim() && llmConfigured) {
            webSearch.process(query.trim(), activeCategory !== 'All' ? activeCategory : undefined);
          }
        }}
        loading={webSearch.progress.stage === 'searching_web' || webSearch.progress.stage === 'processing_llm'}
      />

      {/* Category Tabs */}
      <div className="mt-8 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveCategory('All')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === 'All'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All ({topics.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? `${cat.bgLight} border-2 border-current shadow-sm`
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI Generation Progress / Results */}
      {webSearchEnabled && (webSearch.progress.stage === 'searching_web' || webSearch.progress.stage === 'processing_llm') && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{webSearch.progress.message}</h3>
                <p className="text-sm text-slate-500">Searching for "{webSearch.query}"</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${webSearch.progress.progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
              {webSearch.progress.stage === 'searching_web' ? (
                <>
                  <Globe className="w-4 h-4 animate-spin" /> Fetching recent web results...
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing with LLM and structuring your study note...
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {webSearch.error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">AI processing failed</p>
            <p className="text-sm text-red-600 mt-0.5">{webSearch.error}</p>
          </div>
        </div>
      )}

      {/* AI Generated Result */}
      {webSearchEnabled && webSearch.generatedTopic && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> AI Generated
              </span>
              <span className="text-sm text-slate-500">From web search + LLM</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveFromWeb}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  savedFromWeb
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
              >
                {savedFromWeb ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedFromWeb ? 'Saved!' : 'Save to My Notes'}
              </button>
              <button
                onClick={() => { webSearch.reset(); setWebSearchEnabled(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>
          <TopicDetail topic={webSearch.generatedTopic} />

          {/* Sources */}
          {webSearch.searchResults && webSearch.searchResults.results.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Sources ({webSearch.searchResults.results.length})
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {webSearch.searchResults.results.slice(0, 8).map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        {r.source || 'Web'} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-700">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.snippet}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topic Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {activeCategory === 'All' ? 'All Topics' : `${activeCategory} Topics`}
          <span className="text-sm font-normal text-slate-400">({filteredTopics.length})</span>
        </h2>
        <Link
          to="/add"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Add Topic
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No topics found</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            {query ? `No results for "${query}"` : 'Try a different category or add your own topic'}
          </p>
          <div className="flex justify-center gap-2">
            <Link to="/add" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Add Topic
            </Link>
            {llmConfigured && (
              <button
                onClick={() => setWebSearchEnabled(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                AI Search the Web
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map(topic => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}