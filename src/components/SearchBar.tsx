import { useRef } from 'react';
import { Search, Globe, X, Loader2, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string, webSearchEnabled: boolean) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: (enabled: boolean) => void;
  loading?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  webSearchEnabled,
  onToggleWebSearch,
  loading = false,
}: SearchBarProps) {
  const { llmConfigured } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim(), webSearchEnabled);
    }
  };

  const dynamicPlaceholder = webSearchEnabled
    ? 'Search web + AI analysis... (e.g. Current Affairs, Policy Updates)'
    : 'Search topic for AI analysis... (e.g. UCC, One Nation One Election)';


return (
  <div className="relative w-full max-w-3xl mx-auto">
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-400 transition-all">
      <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={dynamicPlaceholder}
        className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Search Actions */}
      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
        <button
          onClick={() => {
            onToggleWebSearch(false);
            if (value.trim()) onSearch(value.trim(), false);
          }}
          title="Search with AI Only"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            !webSearchEnabled
              ? 'bg-blue-100 text-blue-700 shadow-sm'
              : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          {loading && !webSearchEnabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          AI Only
        </button>

        <button
          onClick={() => {
            onToggleWebSearch(true);
            if (value.trim()) onSearch(value.trim(), true);
          }}
          title="Search the Web + AI"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            webSearchEnabled
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          {loading && webSearchEnabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          Web Search
        </button>
      </div>
    </div>

    {!llmConfigured && (
      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        AI Search requires an LLM API key in <a href="/settings" className="underline">Settings</a>.
      </p>
    )}
  </div>
  );
}