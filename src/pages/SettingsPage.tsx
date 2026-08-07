import { useState, useMemo } from 'react';
import {
  ArrowLeft, Save, Key, Bot, Globe, CheckCircle2, AlertCircle, Eye, EyeOff,
  RotateCcw, ExternalLink, Sparkles
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { LLM_PROVIDERS, SEARCH_PROVIDERS } from '../config/providers';
import { callLLM } from '../services/llm/client';
import ModelCombobox, { type ModelVariant } from '../components/ui/ModelCombobox';

export default function SettingsPage() {
  const settingsContext = useSettings();
  const {
    settings,
    llmConfigured,
    searchConfigured,
    currentLLMApiKey,
    currentSearchApiKey,
    openRouterModels,
    openRouterLoading,
    openRouterError,
    generalComputeModels,
    generalComputeLoading,
    generalComputeError,
    refreshOpenRouterModels,
    refreshGeneralComputeModels
  } = settingsContext;

  const currentLLM = LLM_PROVIDERS.find(p => p.id === settings.llm.provider)!;
  const currentSearch = SEARCH_PROVIDERS.find(p => p.id === settings.search.provider)!;

  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [modelVariant, setModelVariant] = useState<string>('default');

  // Model variant mappings for known models
  const modelVariants: Record<string, ModelVariant[]> = useMemo(() => ({
    'meta-llama/llama-3.1-8b-instruct': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
    'meta-llama/llama-3.1-70b-instruct': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
    'meta-llama/llama-3.1-405b-instruct': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
    'mistralai/mistral-7b-instruct': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
    'google/gemma-2-9b-it': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
    'qwen/qwen-2.5-7b-instruct': [
      { id: 'default', label: 'Default', description: 'Standard version (paid)', suffix: '' },
      { id: 'free', label: 'Free Tier', description: 'Free on OpenRouter', suffix: ':free' },
    ],
  }), []);

  const modelOptions = useMemo(() => {
    if (settings.llm.provider === 'generalcompute') {
      const list = generalComputeModels;
      return list.map(m => ({
        id: m.id,
        name: m.name || m.id,
        isFree: m.isFree || false
      }));
    }
    if (settings.llm.provider !== 'openrouter') {
      return (currentLLM.models || []).map(id => ({
        id,
        name: id,
        isFree: false,
        variants: modelVariants[id] || undefined
      }));
    }

    let list = openRouterModels;
    if (showFreeOnly) {
      list = list.filter(m => m.isFree);
    }

    const formatted = list.map(m => ({
      id: m.id,
      name: m.name,
      isFree: m.isFree,
      variants: modelVariants[m.id] || undefined
    }));

    const currentModel = settings.llm.model;
    const isCurrentModelInList = formatted.some(m => m.id === currentModel);

    if (currentModel && !isCurrentModelInList) {
      const existing = openRouterModels.find(m => m.id === currentModel);
      formatted.unshift({
        id: currentModel,
        name: existing ? existing.name : currentModel,
        isFree: existing ? existing.isFree : currentModel.includes(':free'),
        variants: modelVariants[currentModel] || undefined
      });
    }

    return formatted;
  }, [settings.llm.provider, settings.llm.model, openRouterModels, generalComputeModels, showFreeOnly, currentLLM.models, modelVariants]);

  const currentVariant = modelVariant || (settings.llm.model.includes(':free') ? 'free' : 'default');

  const handleTest = async () => {
    setTestResult({ status: 'testing', message: 'Testing connection...' });
    try {
      const response = await callLLM(
        [
          { role: 'system', content: 'You are a helpful assistant. Reply with exactly: CONNECTION OK' },
          { role: 'user', content: 'Test connection' }
        ],
        settings.llm
      );
      setTestResult({ status: 'success', message: `Connected successfully! Model responded: ${response.slice(0, 80)}` });
    } catch (e: any) {
      setTestResult({ status: 'error', message: e?.message || 'Connection failed' });
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all bg-white";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
          }`}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* LLM Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">LLM Provider</h2>
            <p className="text-sm text-slate-500">Used for AI-powered web search analysis</p>
          </div>
          {llmConfigured && (
            <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Configured
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Provider</label>
            <select
              value={settings.llm.provider}
              onChange={(e) => settingsContext.setLLMProvider(e.target.value as any)}
              className={inputClass}
            >
              {LLM_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">{currentLLM.description}</p>
            {currentLLM.apiKeyUrl !== '#' && (
              <a
                href={currentLLM.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                Get API key <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className={labelClass}>Model</label>
            {settings.llm.provider === 'openrouter' ? (
              <ModelCombobox
                value={settings.llm.model}
                options={modelOptions}
                onChange={(modelId) => {
                  settingsContext.setLLMModel(modelId);
                  // Reset variant when model changes
                  setModelVariant('default');
                }}
                onVariantChange={(variantId) => {
                  setModelVariant(variantId);
                  // Apply variant suffix to model ID
                  const baseModel = settings.llm.model.replace(/:free$/, '').replace(/:extended$/, '');
                  const variant = modelVariants[baseModel]?.find(v => v.id === variantId);
                  const newModelId = variant ? baseModel + variant.suffix : baseModel;
                  settingsContext.setLLMModel(newModelId);
                }}
                currentVariant={currentVariant}
                placeholder="Select a model..."
                showFreeOnly={showFreeOnly}
                onToggleFreeOnly={setShowFreeOnly}
                loading={openRouterLoading}
                error={openRouterError}
                onRefresh={() => refreshOpenRouterModels(true)}
                totalCount={openRouterModels.length}
              />
            ) : settings.llm.provider === 'generalcompute' ? (
              <ModelCombobox
                value={settings.llm.model}
                options={modelOptions}
                onChange={(modelId) => {
                  settingsContext.setLLMModel(modelId);
                }}
                placeholder="Select a model..."
                loading={generalComputeLoading}
                error={generalComputeError}
                onRefresh={() => refreshGeneralComputeModels(true)}
                totalCount={generalComputeModels.length}
              />
            ) : (
              <select
                value={settings.llm.model}
                onChange={(e) => settingsContext.setLLMModel(e.target.value)}
                className={inputClass}
              >
                {modelOptions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name !== m.id ? `${m.name} (${m.id})` : m.id}{m.isFree ? ' [Free]' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>API Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showKey ? 'text' : 'password'}
                value={currentLLMApiKey}
                onChange={(e) => settingsContext.setLLMApiKey(e.target.value)}
                placeholder="sk-..."
                className={`${inputClass} pl-10 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Base URL</label>
            <input
              type="text"
              value={settings.llm.baseUrl}
              onChange={(e) => settingsContext.setLLMBaseUrl(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Temperature</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.llm.temperature}
                onChange={(e) => settingsContext.setTemperature(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-bold text-slate-700 w-8 text-center">
                {settings.llm.temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Lower = more consistent, higher = more creative</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={!llmConfigured || testResult.status === 'testing'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              !llmConfigured
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {testResult.status === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>

          {testResult.status === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> {testResult.message}
            </span>
          )}
          {testResult.status === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
              <AlertCircle className="w-4 h-4" /> {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Web Search Provider</h2>
            <p className="text-sm text-slate-500">Used to fetch recent web results for AI analysis</p>
          </div>
          {searchConfigured && (
            <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Provider</label>
            <select
              value={settings.search.provider}
              onChange={(e) => settingsContext.setSearchProvider(e.target.value as any)}
              className={inputClass}
            >
              {SEARCH_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">{currentSearch.description}</p>
            {currentSearch.apiKeyUrl && (
              <a
                href={currentSearch.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                Get API key <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {currentSearch.requiredKey ? (
            <div>
              <label className={labelClass}>API Key {currentSearch.id === 'langsearch' ? '(optional)' : ''}</label>
              <input
                type="password"
                value={currentSearchApiKey}
                onChange={(e) => settingsContext.setSearchApiKey(e.target.value)}
                placeholder={currentSearch.requiredKey ? 'Required' : 'Optional'}
                className={inputClass}
              />
            </div>
          ) : (
            <div className="flex items-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" /> No API key needed
              </span>
            </div>
          )}

          <div>
            <label className={labelClass}>Max Results</label>
            <input
              type="number"
              min="1"
              max="15"
              value={settings.search.maxResults}
              onChange={(e) => settingsContext.setMaxResults(parseInt(e.target.value) || 8)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Preferences</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Auto-save AI generated notes</p>
            <p className="text-xs text-slate-400">Automatically save AI-generated study notes to your local notes when generated.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSaveWebNotes}
              onChange={(e) => settingsContext.setAutoSaveWebNotes(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
        <p className="text-sm text-blue-800">
          <strong>Privacy:</strong> Your API keys are stored locally in your browser using localStorage.
          They are never sent to any server other than the LLM/search provider you configure, and only when you trigger a search.
        </p>
      </div>

      {/* Reset */}
      <div className="flex justify-center mb-12">
        <button
          onClick={() => {
            if (window.confirm('Reset all settings to defaults?')) {
              settingsContext.resetSettings();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Reset Settings
        </button>
      </div>
    </div>
  );
}