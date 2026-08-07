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
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  webSearchEnabled,
  onToggleWebSearch,
  loading = false,
  placeholder = 'Search a topic... (e.g. Honour Killing, UCC, One Nation One Election)'
}: SearchBarProps) {
  const { llmConfigured } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim(), webSearchEnabled);
    }
  };

  const handleToggleWeb = () => {
    const next = !webSearchEnabled;
    onToggleWebSearch(next);
    if (next && value.trim()) {
      // When enabling, trigger search
      onSearch(value.trim(), true);
    }
  };

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
          placeholder={placeholder}
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

        {/* Web Search Toggle */}
        <button
          onClick={handleToggleWeb}
          disabled={!llmConfigured}
          title={llmConfigured ? 'Toggle web search + AI analysis' : 'Configure an LLM API key in Settings first'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            webSearchEnabled
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          } ${!llmConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className={`w-3.5 h-3.5 ${webSearchEnabled ? 'text-yellow-300' : ''}`} />
          )}
          {webSearchEnabled ? 'AI Search ON' : 'AI Search'}
          <Globe className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>

      {!llmConfigured && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Add your LLM API key in Settings to enable AI-powered web search analysis.
        </p>
      )}
    </div>
  );
}