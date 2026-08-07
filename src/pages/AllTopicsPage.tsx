import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { useTopics } from '../hooks/useTopics';
import TopicCard from '../components/TopicCard';
import { CATEGORIES } from '../data/categories';
import type { CategoryType } from '../types/topic.types';

export default function AllTopicsPage() {
  const { topics, loading } = useTopics();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | CategoryType>('All');

  const filtered = useMemo(() => {
    let result = topics;
    if (category !== 'All') result = result.filter(t => t.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.meaning.toLowerCase().includes(q)
      );
    }
    return result;
  }, [topics, category, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          All Topics
          <span className="text-base font-normal text-slate-400">({topics.length})</span>
        </h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setCategory('All')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            category === 'All'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              category === cat.id
                ? `${cat.bgLight} border-2 border-current`
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No topics found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(topic => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}