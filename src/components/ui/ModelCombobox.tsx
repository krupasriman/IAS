import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export interface ModelOption {
  id: string;
  name: string;
  isFree: boolean;
  variants?: ModelVariant[];
}

export interface ModelVariant {
  id: string;
  label: string;
  description?: string;
  suffix: string; // e.g., ':free', ':extended', etc.
}

interface ModelComboboxProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  onVariantChange?: (variantId: string) => void;
  currentVariant?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showFreeOnly?: boolean;
  onToggleFreeOnly?: (checked: boolean) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  totalCount?: number;
}

export default function ModelCombobox({
  value,
  options,
  onChange,
  onVariantChange,
  currentVariant,
  placeholder = 'Select a model...',
  disabled = false,
  className = '',
  showFreeOnly = false,
  onToggleFreeOnly,
  loading = false,
  error = null,
  onRefresh,
  totalCount
}: ModelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find(opt => opt.id === value);
  const currentVariantOption = currentOption?.variants?.find(v => v.id === currentVariant);
  const hasVariants = currentOption && currentOption.variants && currentOption.variants.length > 0;
  
  const displayValue = currentOption
    ? (currentOption.name !== currentOption.id ? `${currentOption.name} (${currentOption.id})` : currentOption.id) + 
      (currentVariantOption ? ` [${currentVariantOption.label}]` : '') + 
      (currentOption.isFree && !currentVariantOption ? ' [Free]' : '')
    : placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(opt =>
      opt.id.toLowerCase().includes(q) || opt.name.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen, searchQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => Math.max(prev - 1, -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onChange(filteredOptions[highlightedIndex].id);
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          e.preventDefault();
          onChange(filteredOptions[highlightedIndex].id);
        }
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  }, [isOpen, highlightedIndex, filteredOptions, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={dropdownRef}
        className="relative"
        onClick={() => handleFocus()}
      >
        <div
          className={`${inputClass} pl-10 pr-10 py-2.5 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'ring-2 ring-blue-500/40 border-blue-400' : ''}`}
          onClick={() => handleFocus()}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery || (isOpen ? '' : displayValue)}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isOpen ? 'Filter models...' : placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
            readOnly={!isOpen}
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Variant Selector */}
        {hasVariants && (
          <div className="mt-2">
            <label className="block text-xs text-slate-500 mb-1">Variant</label>
            <select
              value={currentVariant || 'default'}
              onChange={(e) => onVariantChange?.(e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 bg-white"
            >
              {currentOption.variants!.map(variant => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} {variant.description ? `— ${variant.description}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {isOpen && (
          <div
            ref={optionsRef}
            className="absolute z-50 mt-1 w-full max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-100"
            role="listbox"
          >
            {loading && (
              <div className="flex items-center justify-center p-6 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading models...
              </div>
            )}
            {!loading && filteredOptions.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                No models found matching "{searchQuery}"
              </div>
            )}
            {!loading && filteredOptions.length > 0 && (
              <div className="py-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOptionClick(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      index === highlightedIndex
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    } ${option.id === value ? 'font-semibold' : ''}`}
                    role="option"
                    aria-selected={option.id === value}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {option.name !== option.id ? (
                          <>
                            <span className="font-medium">{option.name}</span>
                            <span className="text-slate-400 ml-1">({option.id})</span>
                          </>
                        ) : (
                          option.id
                        )}
                      </span>
                      {option.id === value && (
                        <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {(error || (totalCount !== undefined && !loading)) && (
              <div className="border-t border-slate-100 p-2 text-xs text-slate-500">
                {error && <p className="text-red-500">{error}</p>}
                {totalCount !== undefined && !loading && (
                  <p>Showing {filteredOptions.length} of {totalCount} models</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {onToggleFreeOnly !== undefined && (
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFreeOnly}
              onChange={(e) => onToggleFreeOnly(e.target.checked)}
              className="accent-blue-600"
              disabled={disabled}
            />
            Show free models only
          </label>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || disabled}
              title="Refresh live models from OpenRouter"
              className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 transition-colors text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all bg-white";

import { Loader2, RefreshCw } from 'lucide-react';