import {
	AlertCircle,
	ArrowLeft,
	Bot,
	CheckCircle2,
	ExternalLink,
	Globe,
	Key,
	Loader2,
	RotateCcw,
	Save,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal";
import ModelCombobox, {
	type ModelVariant,
} from "../components/ui/ModelCombobox";
import { LLM_PROVIDERS, SEARCH_PROVIDERS } from "../config/providers";
import { useSettings } from "../hooks/useSettings";
import { callLLM } from "../services/llm/client";
import { DEFAULT_OPENROUTER_MODELS } from "../services/llm/models";
import { deleteServerApiKey } from "../services/settingsApi";
import type { LLMProvider, SearchProvider } from "../types/settings.types";
import {
	getApiKeyPlaceholder,
	validateApiKeyFormat,
} from "../utils/apiKeyValidator";

export default function SettingsPage() {
	const settingsContext = useSettings();
	const {
		settings,
		searchConfigured,
		serverKeys,
		isLlmProviderConfigured,
		isSearchProviderConfigured,
		openRouterModels,
		openRouterLoading,
		openRouterError,
		generalComputeModels,
		generalComputeLoading,
		generalComputeError,
		refreshOpenRouterModels,
		refreshGeneralComputeModels,
	} = settingsContext;

	const currentLLM =
		LLM_PROVIDERS.find((p) => p.id === settings.llm.provider) ??
		LLM_PROVIDERS[0];
	const currentSearch =
		SEARCH_PROVIDERS.find((p) => p.id === settings.search.provider) ??
		SEARCH_PROVIDERS[0];

	const [pendingLlmKey, setPendingLlmKey] = useState("");
	const [pendingSearchKey, setPendingSearchKey] = useState("");
	const [isEditingLlmKey, setIsEditingLlmKey] = useState(false);
	const [isEditingSearchKey, setIsEditingSearchKey] = useState(false);
	const [keySaving, setKeySaving] = useState(false);
	const [searchKeySaving, setSearchKeySaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [isResetModalOpen, setIsResetModalOpen] = useState(false);

	const llmKeyInputRef = useRef<HTMLInputElement>(null);
	const searchKeyInputRef = useRef<HTMLInputElement>(null);

	const isLlmVaultConfigured =
		serverKeys.llm.includes(settings.llm.provider) ||
		isLlmProviderConfigured(settings.llm.provider);
	const isSearchVaultConfigured =
		serverKeys.search.includes(settings.search.provider) ||
		isSearchProviderConfigured(settings.search.provider);

	const hasSavedLlmKey = isLlmVaultConfigured && !isEditingLlmKey;
	const hasSavedSearchKey = isSearchVaultConfigured && !isEditingSearchKey;

	const llmKeyValidation = useMemo(() => {
		if (!pendingLlmKey.trim()) {
			return { isValid: true };
		}
		return validateApiKeyFormat(settings.llm.provider, pendingLlmKey.trim());
	}, [settings.llm.provider, pendingLlmKey]);

	const searchKeyValidation = useMemo(() => {
		if (!currentSearch.requiredKey || !pendingSearchKey.trim()) {
			return { isValid: true };
		}
		return validateApiKeyFormat(
			settings.search.provider,
			pendingSearchKey.trim(),
		);
	}, [currentSearch.requiredKey, settings.search.provider, pendingSearchKey]);

	const isFormValid =
		llmKeyValidation.isValid &&
		(!currentSearch.requiredKey || searchKeyValidation.isValid);

	const handleSave = async () => {
		if (!llmKeyValidation.isValid) {
			setTestResult({
				status: "error",
				message: llmKeyValidation.error || "Invalid LLM API key format",
			});
			return;
		}
		if (currentSearch.requiredKey && !searchKeyValidation.isValid) {
			setTestResult({
				status: "error",
				message: searchKeyValidation.error || "Invalid Search API key format",
			});
			return;
		}

		// Encrypt to server vault and scrub cleartext from DOM and React state immediately
		if (pendingLlmKey.trim()) {
			await settingsContext.setLLMApiKey(pendingLlmKey.trim()).catch(() => {});
			setPendingLlmKey("");
		}
		if (pendingSearchKey.trim()) {
			await settingsContext
				.setSearchApiKey(pendingSearchKey.trim())
				.catch(() => {});
			setPendingSearchKey("");
		}

		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};
	const [testResult, setTestResult] = useState<{
		status: "idle" | "testing" | "success" | "error";
		message: string;
	}>({
		status: "idle",
		message: "",
	});

	const [showFreeOnly, setShowFreeOnly] = useState(false);
	const [modelVariant, setModelVariant] = useState<string>("default");

	// Model variant mappings for known models
	const modelVariants: Record<string, ModelVariant[]> = useMemo(
		() => ({
			"meta-llama/llama-3.1-8b-instruct": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
			"meta-llama/llama-3.1-70b-instruct": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
			"meta-llama/llama-3.1-405b-instruct": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
			"mistralai/mistral-7b-instruct": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
			"google/gemma-2-9b-it": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
			"qwen/qwen-2.5-7b-instruct": [
				{
					id: "default",
					label: "Default",
					description: "Standard version (paid)",
					suffix: "",
				},
				{
					id: "free",
					label: "Free Tier",
					description: "Free on OpenRouter",
					suffix: ":free",
				},
			],
		}),
		[],
	);

	const modelOptions = useMemo(() => {
		if (settings.llm.provider === "generalcompute") {
			const list =
				generalComputeModels.length > 0
					? generalComputeModels
					: (currentLLM.models || []).map((id) => ({
							id,
							name: id,
							isFree: false,
						}));
			return list.map((m) => ({
				id: m.id,
				name: m.name || m.id,
				isFree: m.isFree || false,
			}));
		}
		if (settings.llm.provider !== "openrouter") {
			return (currentLLM.models || []).map((id) => ({
				id,
				name: id,
				isFree: false,
				variants: modelVariants[id] || undefined,
			}));
		}

		let list =
			openRouterModels.length > 0
				? openRouterModels
				: DEFAULT_OPENROUTER_MODELS;
		if (showFreeOnly) {
			list = list.filter((m) => m.isFree);
		}

		const formatted = list.map((m) => ({
			id: m.id,
			name: m.name,
			isFree: m.isFree,
			variants: modelVariants[m.id] || undefined,
		}));

		const currentModel = settings.llm.model;
		const isCurrentModelInList = formatted.some((m) => m.id === currentModel);

		if (currentModel && !isCurrentModelInList) {
			const existing = list.find((m) => m.id === currentModel);
			formatted.unshift({
				id: currentModel,
				name: existing ? existing.name : currentModel,
				isFree: existing ? existing.isFree : currentModel.includes(":free"),
				variants: modelVariants[currentModel] || undefined,
			});
		}

		return formatted;
	}, [
		settings.llm.provider,
		settings.llm.model,
		openRouterModels,
		generalComputeModels,
		showFreeOnly,
		currentLLM.models,
		modelVariants,
	]);

	const currentVariant =
		modelVariant || (settings.llm.model.includes(":free") ? "free" : "default");

	const handleTest = async () => {
		const key = pendingLlmKey.trim();
		if (!key && !isLlmVaultConfigured) {
			setTestResult({
				status: "error",
				message: `Please enter a ${currentLLM.name} API key before testing connection.`,
			});
			return;
		}

		if (key && !llmKeyValidation.isValid) {
			setTestResult({
				status: "error",
				message: llmKeyValidation.error || "Invalid API key format.",
			});
			return;
		}

		setTestResult({ status: "testing", message: "Testing connection..." });
		try {
			const testConfig = {
				...settings.llm,
				provider: settings.llm.provider,
				apiKeys: {
					...settings.llm.apiKeys,
					[settings.llm.provider]: key,
				},
				apiKey: key || undefined,
				model: settings.llm.model,
			};
			const response = await callLLM(
				[
					{
						role: "system",
						content:
							"You are a helpful assistant. Reply with exactly: CONNECTION OK",
					},
					{ role: "user", content: "Test connection" },
				],
				testConfig,
			);
			setTestResult({
				status: "success",
				message: `Connected successfully! Model responded: ${response.slice(0, 80)}`,
			});
		} catch (e: unknown) {
			setTestResult({
				status: "error",
				message:
					typeof e === "object" && e !== null && "message" in e
						? String((e as { message: unknown }).message)
						: "Connection failed",
			});
		}
	};

	const inputClass =
		"w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all bg-white";
	const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

	return (
		<div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
			<div className="max-w-3xl mx-auto px-4 py-6">
				<button
					type="button"
					onClick={() => window.history.back()}
					className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
				>
					<ArrowLeft className="w-4 h-4" /> Back
				</button>

				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-slate-900">Settings</h1>
					<button
						type="button"
						onClick={handleSave}
						disabled={!isFormValid}
						className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
							!isFormValid
								? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
								: saved
									? "bg-emerald-500 text-white"
									: "bg-blue-600 text-white hover:bg-blue-700 shadow-md cursor-pointer"
						}`}
					>
						{saved ? (
							<CheckCircle2 className="w-4 h-4" />
						) : (
							<Save className="w-4 h-4" />
						)}
						{saved ? "Saved!" : "Save Settings"}
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
							<p className="text-sm text-slate-500">
								Used for AI-powered web search analysis
							</p>
						</div>
						{isLlmVaultConfigured ? (
							<span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
								<CheckCircle2 className="w-3.5 h-3.5" /> Configured
							</span>
						) : (
							<span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
								<AlertCircle className="w-3.5 h-3.5" /> Key Required
							</span>
						)}
					</div>

					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className={labelClass} htmlFor="llm-provider">
								Provider
							</label>
							<select
								id="llm-provider"
								value={settings.llm.provider}
								onChange={(e) => {
									const newProvider = e.target.value as LLMProvider;
									settingsContext.setLLMProvider(newProvider);
									setPendingLlmKey("");
									setIsEditingLlmKey(false);
									setTestResult({ status: "idle", message: "" });
									const hasKey = serverKeys.llm.includes(newProvider);
									if (!hasKey) {
										setTimeout(() => llmKeyInputRef.current?.focus(), 50);
									}
								}}
								className={inputClass}
							>
								{LLM_PROVIDERS.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
							<p className="text-xs text-slate-400 mt-1.5">
								{currentLLM.description}
							</p>
							{currentLLM.apiKeyUrl !== "#" && (
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
							<label className={labelClass} htmlFor="llm-model">
								Model
							</label>
							{settings.llm.provider === "openrouter" ? (
								<ModelCombobox
									value={settings.llm.model}
									options={modelOptions}
									onChange={(modelId) => {
										settingsContext.setLLMModel(modelId);
										setTestResult({ status: "idle", message: "" });
										// Reset variant when model changes
										setModelVariant("default");
									}}
									onVariantChange={(variantId) => {
										setModelVariant(variantId);
										// Apply variant suffix to model ID
										const baseModel = settings.llm.model
											.replace(/:free$/, "")
											.replace(/:extended$/, "");
										const variant = modelVariants[baseModel]?.find(
											(v) => v.id === variantId,
										);
										const newModelId = variant
											? baseModel + variant.suffix
											: baseModel;
										settingsContext.setLLMModel(newModelId);
										setTestResult({ status: "idle", message: "" });
									}}
									currentVariant={currentVariant}
									placeholder="Select a model..."
									showFreeOnly={showFreeOnly}
									onToggleFreeOnly={setShowFreeOnly}
									loading={openRouterLoading}
									error={openRouterError}
									onRefresh={() => refreshOpenRouterModels(true)}
									totalCount={openRouterModels.length || modelOptions.length}
								/>
							) : settings.llm.provider === "generalcompute" ? (
								<ModelCombobox
									value={settings.llm.model}
									options={modelOptions}
									onChange={(modelId) => {
										settingsContext.setLLMModel(modelId);
										setTestResult({ status: "idle", message: "" });
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
									onChange={(e) => {
										settingsContext.setLLMModel(e.target.value);
										setTestResult({ status: "idle", message: "" });
									}}
									className={inputClass}
								>
									{modelOptions.map((m) => (
										<option key={m.id} value={m.id}>
											{m.name !== m.id ? `${m.name} (${m.id})` : m.id}
											{m.isFree ? " [Free]" : ""}
										</option>
									))}
								</select>
							)}
						</div>

						<div className="sm:col-span-2">
							<div className="flex items-center justify-between mb-1.5">
								<label className={labelClass} htmlFor="llm-api-key">
									{currentLLM.name} API Key
								</label>
								{isLlmVaultConfigured ? (
									<span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
										<CheckCircle2 className="w-3.5 h-3.5" /> Vault Encrypted
									</span>
								) : (
									<span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">
										<AlertCircle className="w-3.5 h-3.5" /> Key Required
									</span>
								)}
							</div>
							<div className="flex gap-2">
								<div className="relative flex-1">
									<Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
									<input
										ref={llmKeyInputRef}
										id="llm-api-key"
										type="password"
										autoComplete="new-password"
										spellCheck={false}
										value={hasSavedLlmKey ? "••••••••••••••••" : pendingLlmKey}
										onFocus={(e) => {
											if (hasSavedLlmKey) {
												e.target.select();
											}
										}}
										onChange={(e) => {
											setIsEditingLlmKey(true);
											const val = e.target.value;
											setPendingLlmKey(val.replace(/•/g, ""));
											setTestResult({ status: "idle", message: "" });
										}}
										placeholder={
											isLlmVaultConfigured
												? "•••••••••••••••• (Encrypted in Server Vault)"
												: `Enter ${currentLLM.name} API key (${getApiKeyPlaceholder(settings.llm.provider)})`
										}
										className={`${inputClass} pl-10 ${
											pendingLlmKey.trim() && !llmKeyValidation.isValid
												? "border-red-400 focus:ring-red-500/40 focus:border-red-500"
												: ""
										}`}
									/>
								</div>
								{pendingLlmKey.trim() ? (
									<button
										type="button"
										disabled={
											!validateApiKeyFormat(
												settings.llm.provider,
												pendingLlmKey.trim(),
											).isValid || keySaving
										}
										onClick={async () => {
											const key = pendingLlmKey.trim();
											if (!key) return;
											const validation = validateApiKeyFormat(
												settings.llm.provider,
												key,
											);
											if (!validation.isValid) {
												setTestResult({
													status: "error",
													message: validation.error || "Invalid API key format",
												});
												return;
											}
											setKeySaving(true);
											try {
												await settingsContext.setLLMApiKeyForProvider(
													settings.llm.provider,
													key,
												);
												setPendingLlmKey("");
												setIsEditingLlmKey(false);
												setTestResult({
													status: "success",
													message: `${currentLLM.name} key encrypted and saved to server vault!`,
												});
											} catch {
												setTestResult({
													status: "error",
													message: "Failed to store API key in server vault.",
												});
											} finally {
												setKeySaving(false);
											}
										}}
										className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex-shrink-0"
									>
										{keySaving ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Save className="w-4 h-4" />
										)}
										Save Key
									</button>
								) : isLlmVaultConfigured ? (
									<button
										type="button"
										onClick={async () => {
											settingsContext.clearServerKey(
												"llm",
												settings.llm.provider,
											);
											await deleteServerApiKey(
												"llm",
												settings.llm.provider,
											).catch(() => {});
											setPendingLlmKey("");
											setIsEditingLlmKey(false);
											setTestResult({ status: "idle", message: "" });
											setTimeout(() => llmKeyInputRef.current?.focus(), 50);
										}}
										className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors shadow-sm flex-shrink-0"
										title="Clear this API key to enter a new one"
									>
										<Trash2 className="w-4 h-4" />
										Clear
									</button>
								) : (
									<button
										type="button"
										disabled
										className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white opacity-40 cursor-not-allowed shadow-sm flex-shrink-0"
									>
										<Save className="w-4 h-4" />
										Save Key
									</button>
								)}
							</div>
							{pendingLlmKey.trim() && !llmKeyValidation.isValid && (
								<p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
									<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
									{llmKeyValidation.error}
								</p>
							)}
						</div>

						<div>
							<label className={labelClass} htmlFor="llm-base-url">
								Base URL
							</label>
							<input
								id="llm-base-url"
								type="text"
								value={settings.llm.baseUrl}
								onChange={(e) => {
									settingsContext.setLLMBaseUrl(e.target.value);
									setTestResult({ status: "idle", message: "" });
								}}
								className={inputClass}
							/>
						</div>

						<div>
							<label className={labelClass} htmlFor="llm-temperature">
								Temperature
							</label>
							<div className="flex items-center gap-3">
								<input
									id="llm-temperature"
									type="range"
									min="0"
									max="1"
									step="0.1"
									value={settings.llm.temperature}
									onChange={(e) =>
										settingsContext.setTemperature(parseFloat(e.target.value))
									}
									className="flex-1 accent-blue-600"
								/>
								<span className="text-sm font-bold text-slate-700 w-8 text-center">
									{settings.llm.temperature.toFixed(1)}
								</span>
							</div>
							<p className="text-xs text-slate-400 mt-1">
								Lower = more consistent, higher = more creative
							</p>
						</div>
					</div>

					<div className="mt-5 flex items-center gap-3">
						<button
							type="button"
							onClick={handleTest}
							disabled={
								(!pendingLlmKey.trim() &&
									!isLlmVaultConfigured &&
									settings.llm.provider !== "generalcompute") ||
								!llmKeyValidation.isValid ||
								testResult.status === "testing"
							}
							className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
								(!pendingLlmKey.trim() && !isLlmVaultConfigured) ||
								!llmKeyValidation.isValid
									? "bg-slate-100 text-slate-400 cursor-not-allowed"
									: "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-sm"
							}`}
						>
							<Sparkles className="w-4 h-4" />
							{testResult.status === "testing"
								? "Testing..."
								: "Test Connection"}
						</button>

						{testResult.status === "success" && (
							<span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
								<CheckCircle2 className="w-4 h-4" /> {testResult.message}
							</span>
						)}
						{testResult.status === "error" && (
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
							<h2 className="text-lg font-bold text-slate-900">
								Web Search Provider
							</h2>
							<p className="text-sm text-slate-500">
								Used to fetch recent web results for AI analysis
							</p>
						</div>
						{searchConfigured ? (
							<span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
								<CheckCircle2 className="w-3.5 h-3.5" /> Ready
							</span>
						) : (
							<span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
								<AlertCircle className="w-3.5 h-3.5" /> API Key Required
							</span>
						)}
					</div>

					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className={labelClass} htmlFor="search-provider">
								Provider
							</label>
							<select
								id="search-provider"
								value={settings.search.provider}
								onChange={(e) => {
									const newProvider = e.target.value as SearchProvider;
									settingsContext.setSearchProvider(newProvider);
									setPendingSearchKey("");
									setIsEditingSearchKey(false);
									setTestResult({ status: "idle", message: "" });
									const info = SEARCH_PROVIDERS.find(
										(p) => p.id === newProvider,
									);
									const hasKey = serverKeys.search.includes(newProvider);
									if (info?.requiredKey && !hasKey) {
										setTimeout(() => searchKeyInputRef.current?.focus(), 50);
									}
								}}
								className={inputClass}
							>
								{SEARCH_PROVIDERS.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
							<p className="text-xs text-slate-400 mt-1.5">
								{currentSearch.description}
							</p>
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
							<div className="sm:col-span-2">
								<div className="flex items-center justify-between mb-1.5">
									<label className={labelClass} htmlFor="search-api-key">
										{currentSearch.name} API Key{" "}
										{currentSearch.id === "langsearch" ? "(optional)" : ""}
									</label>
									{isSearchVaultConfigured ? (
										<span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
											<CheckCircle2 className="w-3.5 h-3.5" /> Vault Encrypted
										</span>
									) : (
										<span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">
											<AlertCircle className="w-3.5 h-3.5" /> Key Required
										</span>
									)}
								</div>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
										<input
											ref={searchKeyInputRef}
											id="search-api-key"
											type="password"
											autoComplete="new-password"
											spellCheck={false}
											value={
												hasSavedSearchKey
													? "••••••••••••••••"
													: pendingSearchKey
											}
											onFocus={(e) => {
												if (hasSavedSearchKey) {
													e.target.select();
												}
											}}
											onChange={(e) => {
												setIsEditingSearchKey(true);
												const val = e.target.value;
												setPendingSearchKey(val.replace(/•/g, ""));
												setTestResult({ status: "idle", message: "" });
											}}
											placeholder={
												isSearchVaultConfigured
													? "•••••••••••••••• (Encrypted in Server Vault)"
													: `Enter ${currentSearch.name} API key (${getApiKeyPlaceholder(settings.search.provider)})`
											}
											className={`${inputClass} pl-10 ${
												pendingSearchKey.trim() && !searchKeyValidation.isValid
													? "border-red-400 focus:ring-red-500/40 focus:border-red-500"
													: ""
											}`}
										/>
									</div>
									{pendingSearchKey.trim() ? (
										<button
											type="button"
											disabled={
												!validateApiKeyFormat(
													settings.search.provider,
													pendingSearchKey.trim(),
												).isValid || searchKeySaving
											}
											onClick={async () => {
												const key = pendingSearchKey.trim();
												if (!key) return;
												const validation = validateApiKeyFormat(
													settings.search.provider,
													key,
												);
												if (!validation.isValid) {
													setTestResult({
														status: "error",
														message:
															validation.error || "Invalid API key format",
													});
													return;
												}
												setSearchKeySaving(true);
												try {
													await settingsContext.setSearchApiKeyForProvider(
														settings.search.provider,
														key,
													);
													setPendingSearchKey("");
													setIsEditingSearchKey(false);
													setTestResult({
														status: "success",
														message: `${currentSearch.name} key encrypted and saved to server vault!`,
													});
												} catch {
													setTestResult({
														status: "error",
														message:
															"Failed to store Search API key in server vault.",
													});
												} finally {
													setSearchKeySaving(false);
												}
											}}
											className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex-shrink-0"
										>
											{searchKeySaving ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												<Save className="w-4 h-4" />
											)}
											Save Key
										</button>
									) : isSearchVaultConfigured ? (
										<button
											type="button"
											onClick={async () => {
												settingsContext.clearServerKey(
													"search",
													settings.search.provider,
												);
												await deleteServerApiKey(
													"search",
													settings.search.provider,
												).catch(() => {});
												setPendingSearchKey("");
												setIsEditingSearchKey(false);
												setTestResult({ status: "idle", message: "" });
												setTimeout(
													() => searchKeyInputRef.current?.focus(),
													50,
												);
											}}
											className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors shadow-sm flex-shrink-0"
											title="Clear this API key to enter a new one"
										>
											<Trash2 className="w-4 h-4" />
											Clear
										</button>
									) : (
										<button
											type="button"
											disabled
											className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white opacity-40 cursor-not-allowed shadow-sm flex-shrink-0"
										>
											<Save className="w-4 h-4" />
											Save Key
										</button>
									)}
								</div>
								{pendingSearchKey.trim() && !searchKeyValidation.isValid && (
									<p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
										<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
										{searchKeyValidation.error}
									</p>
								)}
							</div>
						) : (
							<div className="flex items-end">
								<span className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
									<CheckCircle2 className="w-4 h-4" /> No API key needed
								</span>
							</div>
						)}

						<div>
							<label className={labelClass} htmlFor="search-max-results">
								Max Results
							</label>
							<input
								id="search-max-results"
								type="number"
								min="1"
								max="15"
								value={settings.search.maxResults}
								onChange={(e) =>
									settingsContext.setMaxResults(
										parseInt(e.target.value, 10) || 8,
									)
								}
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
							<p className="font-semibold text-slate-800 text-sm">
								Auto-save AI generated notes
							</p>
							<p className="text-xs text-slate-400">
								Automatically save AI-generated study notes to your local notes
								when generated.
							</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={settings.autoSaveWebNotes}
								onChange={(e) =>
									settingsContext.setAutoSaveWebNotes(e.target.checked)
								}
								className="sr-only peer"
							/>
							<div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
						</label>
					</div>
				</div>

				{/* Privacy Note */}
				<div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
					<p className="text-sm text-blue-800">
						<strong>Privacy & Zero-Storage Security:</strong> Your API keys are
						never saved in cleartext in your browser's localStorage. When you
						enter a key, it is transmitted to the server where it is encrypted
						using AES-256-GCM. Keys are only decrypted in memory when an AI
						generation or web search is executed.
					</p>
				</div>

				{/* Reset */}
				<div className="flex justify-center mb-12">
					<button
						type="button"
						onClick={() => setIsResetModalOpen(true)}
						className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] text-sm font-semibold hover:bg-amber-500/10 transition-colors cursor-pointer border border-[var(--border)]"
					>
						<RotateCcw className="w-4 h-4" /> Reset Settings
					</button>
				</div>
			</div>

			{/* Reset Settings Confirmation Modal */}
			<ConfirmModal
				isOpen={isResetModalOpen}
				title="Reset All Settings"
				message="Are you sure you want to reset all API keys, model selections, and custom preferences to their default values?"
				confirmText="Reset to Defaults"
				cancelText="Cancel"
				variant="warning"
				onConfirm={() => {
					settingsContext.resetSettings();
					setIsResetModalOpen(false);
				}}
				onCancel={() => setIsResetModalOpen(false)}
			/>
		</div>
	);
}
