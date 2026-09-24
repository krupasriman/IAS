import {
	AlertCircle,
	Bot,
	CheckCircle2,
	Database,
	ExternalLink,
	Globe,
	Loader2,
	Moon,
	Save,
	Search,
	Settings,
	Shield,
	Sun,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModelCombobox, {
	type ModelOption,
	type ModelVariant,
} from "../components/ui/ModelCombobox";
import { LLM_PROVIDERS, SEARCH_PROVIDERS } from "../config/providers";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSettings } from "../hooks/useSettings";
import { useTopics } from "../hooks/useTopics";
import { callLLM } from "../services/llm/client";
import { DEFAULT_OPENROUTER_MODELS } from "../services/llm/models";
import { deleteServerApiKey } from "../services/settingsApi";
import type { LLMProvider, SearchProvider } from "../types/settings.types";
import {
	getApiKeyPlaceholder,
	validateApiKeyFormat,
} from "../utils/apiKeyValidator";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialTab?: SettingsTab;
}

export type SettingsTab = "general" | "llm" | "search" | "data" | "security";

export default function SettingsModal({
	isOpen,
	onClose,
	initialTab = "general",
}: SettingsModalProps) {
	const { dark, toggleDark } = useWorkspace();
	const { topics } = useTopics();
	const {
		settings,
		isLlmProviderConfigured,
		isSearchProviderConfigured,
		serverKeys,
		clearServerKey,
		openRouterModels,
		openRouterLoading,
		generalComputeModels,
		generalComputeLoading,
		setLLMProvider,
		setLLMApiKeyForProvider,
		setLLMModel,
		setSearchProvider,
		setSearchApiKeyForProvider,
		setMaxResults,
	} = useSettings();

	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
	const [searchFilter, setSearchFilter] = useState("");
	const [pendingLlmKey, setPendingLlmKey] = useState("");
	const [pendingSearchKey, setPendingSearchKey] = useState("");
	const [isEditingLlmKey, setIsEditingLlmKey] = useState(false);
	const [isEditingSearchKey, setIsEditingSearchKey] = useState(false);
	const [modalLlmSaving, setModalLlmSaving] = useState(false);
	const [modalSearchSaving, setModalSearchSaving] = useState(false);
	const [modelVariant, setModelVariant] = useState<string>("default");

	const llmInputRef = useRef<HTMLInputElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const [saved, setSaved] = useState(false);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const triggerSaved = useCallback(() => {
		setSaved(true);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
	}, []);

	const [testResult, setTestResult] = useState<{
		status: "idle" | "testing" | "success" | "error";
		message: string;
	}>({
		status: "idle",
		message: "",
	});

	const [showFreeOnly, setShowFreeOnly] = useState(false);

	// Sync active tab when modal opens
	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTab);
			setTestResult({ status: "idle", message: "" });
			setIsEditingLlmKey(false);
			setPendingLlmKey("");
			setIsEditingSearchKey(false);
			setPendingSearchKey("");
		}
	}, [isOpen, initialTab]);

	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const currentLLM =
		LLM_PROVIDERS.find((p) => p.id === settings.llm.provider) ??
		LLM_PROVIDERS[0];
	const currentSearch =
		SEARCH_PROVIDERS.find((p) => p.id === settings.search.provider) ??
		SEARCH_PROVIDERS[0];

	// Model variant mappings
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
		}),
		[],
	);

	const modelOptions: ModelOption[] = useMemo(() => {
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

		const list =
			openRouterModels.length > 0
				? openRouterModels
				: DEFAULT_OPENROUTER_MODELS;
		let filtered = list;
		if (showFreeOnly) {
			filtered = filtered.filter((m) => m.isFree);
		}

		const formatted: ModelOption[] = filtered.map((m) => ({
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
				apiKey: key || undefined,
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
				message: `Connected successfully! Model response: ${response.slice(0, 70)}`,
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

	if (!isOpen) return null;

	const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
		{ id: "general", label: "General", icon: Settings },
		{ id: "llm", label: "LLM Provider", icon: Bot },
		{ id: "search", label: "Web Search", icon: Globe },
		{ id: "data", label: "Data & Storage", icon: Database },
		{ id: "security", label: "Security & Auth", icon: Shield },
	];

	const filteredTabs = tabs.filter((t) =>
		t.label.toLowerCase().includes(searchFilter.toLowerCase()),
	);

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Main Modal Window */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Settings"
				className="relative z-10 w-full max-w-4xl h-[640px] max-h-[90vh] bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 text-[var(--text)]"
				style={{ background: "var(--surface)" }}
			>
				{/* ── Left Sidebar Inside Modal ── */}
				<div className="w-full md:w-64 bg-[var(--surface-sidebar)] border-r border-[var(--border)] p-4 flex flex-col flex-shrink-0">
					{/* Close Button + Title */}
					<div className="flex items-center justify-between mb-4">
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-xl hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer border border-[var(--border)]"
							title="Close settings"
						>
							<X className="w-4 h-4" />
						</button>
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Settings
						</span>
					</div>

					{/* Search input */}
					<div className="relative mb-3">
						<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
						<input
							type="text"
							value={searchFilter}
							onChange={(e) => setSearchFilter(e.target.value)}
							placeholder="Search settings…"
							className="w-full rounded-xl pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--border)] outline-none placeholder:text-[var(--faint)] text-[var(--text)]"
						/>
					</div>

					{/* Tabs List */}
					<nav className="space-y-1 flex-1 overflow-y-auto">
						{filteredTabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => {
										setActiveTab(tab.id);
										setTestResult({ status: "idle", message: "" });
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
										isActive
											? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-semibold border border-[var(--border)]"
											: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
									}`}
								>
									<Icon className="w-4 h-4 flex-shrink-0" />
									<span className="truncate flex-1">{tab.label}</span>
								</button>
							);
						})}
					</nav>

					{/* Bottom Actions */}
					<div className="pt-3 border-t border-[var(--border)] flex flex-col gap-1.5">
						<button
							type="button"
							onClick={onClose}
							className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
						>
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>Done</span>
						</button>
						{saved && (
							<span className="text-[11px] text-center text-emerald-500 font-medium animate-in fade-in flex items-center justify-center gap-1">
								<CheckCircle2 className="w-3 h-3" /> All changes auto-saved
							</span>
						)}
					</div>
				</div>

				{/* ── Right Content Panel ── */}
				<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--surface)]">
					{/* Panel Header */}
					<div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
						<div>
							<h2 className="text-lg font-bold text-[var(--text)]">
								{activeTab === "general" && "General Preferences"}
								{activeTab === "llm" && "LLM Configuration"}
								{activeTab === "search" && "Web Search Engine"}
								{activeTab === "data" && "Data & Storage"}
								{activeTab === "security" && "Security & Key Encryption"}
							</h2>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								{activeTab === "general" &&
									"Manage interface appearance and application defaults"}
								{activeTab === "llm" &&
									"Configure AI models and inference API keys"}
								{activeTab === "search" &&
									"Choose your live search engine for UPSC research"}
								{activeTab === "data" &&
									"Inspect database records and export library notes"}
								{activeTab === "security" &&
									"AES-256-GCM hardware encryption and auth mode"}
							</p>
						</div>
					</div>

					{/* Panel Body */}
					<div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
						{/* ── TAB 1: GENERAL ── */}
						{activeTab === "general" && (
							<div className="divide-y divide-[var(--border)]">
								{/* Theme Setting */}
								<div className="py-4 first:pt-0 flex items-center justify-between gap-4">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Appearance
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Select your preferred interface theme
										</p>
									</div>
									<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
										<button
											type="button"
											onClick={() => {
												if (dark) toggleDark();
												triggerSaved();
											}}
											className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
												!dark
													? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
													: "text-[var(--muted)]"
											}`}
										>
											<Sun className="w-3.5 h-3.5 text-amber-500" />
											<span>Light</span>
										</button>
										<button
											type="button"
											onClick={() => {
												if (!dark) toggleDark();
												triggerSaved();
											}}
											className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
												dark
													? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
													: "text-[var(--muted)]"
											}`}
										>
											<Moon className="w-3.5 h-3.5" />
											<span>Dark</span>
										</button>
									</div>
								</div>

								{/* Default Target Year */}
								<div className="py-4 flex items-center justify-between gap-4">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Target Examination
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Primary syllabus and answer alignment
										</p>
									</div>
									<span className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-xs font-bold text-[var(--text)] border border-[var(--border)]">
										UPSC Mains 2026
									</span>
								</div>

								{/* Auto-save */}
								<div className="py-4 flex items-center justify-between gap-4">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Local Session Caching
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Persist recent search tabs across browser refreshes
										</p>
									</div>
									<span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
										<CheckCircle2 className="w-4 h-4" /> Enabled
									</span>
								</div>
							</div>
						)}

						{/* ── TAB 2: LLM PROVIDER ── */}
						{activeTab === "llm" && (
							<div className="space-y-4">
								{/* Provider Select */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											htmlFor="llm-provider-select"
											className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
										>
											LLM Provider
										</label>
									</div>
									<select
										id="llm-provider-select"
										value={settings.llm.provider}
										onChange={(e) => {
											const prov = e.target.value as LLMProvider;
											setLLMProvider(prov);
											setPendingLlmKey("");
											setIsEditingLlmKey(false);
											setTestResult({ status: "idle", message: "" });
											const hasKey =
												serverKeys.llm.includes(prov) ||
												isLlmProviderConfigured(prov);
											if (hasKey) {
												triggerSaved();
											} else {
												setTimeout(() => llmInputRef.current?.focus(), 50);
											}
										}}
										className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none"
									>
										{LLM_PROVIDERS.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
									<p className="text-[11px] text-[var(--muted)] mt-1">
										{currentLLM.description}
									</p>
								</div>

								{/* API Key Input */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											htmlFor="llm-api-key"
											className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
										>
											{currentLLM.name} API Key
										</label>
										<div className="flex items-center gap-2">
											{isLlmVaultConfigured ? (
												<span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
													<CheckCircle2 className="w-3.5 h-3.5" /> Vault
													Encrypted
												</span>
											) : (
												<span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
													<AlertCircle className="w-3.5 h-3.5" /> Key Required
												</span>
											)}
											{currentLLM.apiKeyUrl && (
												<a
													href={currentLLM.apiKeyUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="text-xs text-emerald-500 hover:underline flex items-center gap-1"
												>
													Get {currentLLM.name} key{" "}
													<ExternalLink className="w-3 h-3" />
												</a>
											)}
										</div>
									</div>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												ref={llmInputRef}
												id="llm-api-key"
												type="password"
												autoComplete="new-password"
												spellCheck={false}
												value={
													hasSavedLlmKey ? "••••••••••••••••" : pendingLlmKey
												}
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
												className={`w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none font-mono ${
													pendingLlmKey.trim() && !llmKeyValidation.isValid
														? "border-red-400 focus:ring-2 focus:ring-red-500/40"
														: "border-[var(--border)] focus:border-blue-500"
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
													).isValid || modalLlmSaving
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
															message:
																validation.error || "Invalid API key format",
														});
														return;
													}
													setModalLlmSaving(true);
													try {
														await setLLMApiKeyForProvider(
															settings.llm.provider,
															key,
														);
														setPendingLlmKey("");
														setIsEditingLlmKey(false);
														triggerSaved();
														setTestResult({
															status: "success",
															message: `${currentLLM.name} key encrypted and saved to server vault!`,
														});
													} catch {
														setTestResult({
															status: "error",
															message:
																"Failed to store API key in server vault.",
														});
													} finally {
														setModalLlmSaving(false);
													}
												}}
												className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
											>
												{modalLlmSaving ? (
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Save className="w-3.5 h-3.5" />
												)}
												Save Key
											</button>
										) : isLlmVaultConfigured ? (
											<button
												type="button"
												onClick={async () => {
													clearServerKey("llm", settings.llm.provider);
													await deleteServerApiKey(
														"llm",
														settings.llm.provider,
													).catch(() => {});
													setPendingLlmKey("");
													setIsEditingLlmKey(false);
													setTestResult({ status: "idle", message: "" });
													setTimeout(() => llmInputRef.current?.focus(), 50);
												}}
												className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
												title="Clear this API key to enter a new one"
											>
												<Trash2 className="w-3.5 h-3.5" />
												Clear
											</button>
										) : (
											<button
												type="button"
												disabled
												className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white opacity-40 cursor-not-allowed shadow-sm flex items-center gap-1.5 flex-shrink-0"
											>
												<Save className="w-3.5 h-3.5" />
												Save Key
											</button>
										)}
									</div>
									{pendingLlmKey.trim() && !llmKeyValidation.isValid && (
										<p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
											<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
											{llmKeyValidation.error}
										</p>
									)}
								</div>

								{/* Model Selection */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											htmlFor="llm-model-combobox"
											className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
										>
											Model
										</label>
										{settings.llm.provider === "openrouter" && (
											<label className="flex items-center gap-1.5 text-xs text-[var(--muted)] cursor-pointer">
												<input
													type="checkbox"
													checked={showFreeOnly}
													onChange={(e) => setShowFreeOnly(e.target.checked)}
													className="rounded accent-emerald-500"
												/>
												Free models only
											</label>
										)}
									</div>

									<ModelCombobox
										value={settings.llm.model}
										options={modelOptions}
										onChange={(modelId) => {
											setLLMModel(modelId);
											setModelVariant("default");
											setTestResult({ status: "idle", message: "" });
											triggerSaved();
										}}
										onVariantChange={(variantId) => {
											setModelVariant(variantId);
											const baseModel = settings.llm.model
												.replace(/:free$/, "")
												.replace(/:extended$/, "");
											const variant = modelVariants[baseModel]?.find(
												(v) => v.id === variantId,
											);
											const newModelId = variant
												? baseModel + variant.suffix
												: baseModel;
											setLLMModel(newModelId);
											setTestResult({ status: "idle", message: "" });
											triggerSaved();
										}}
										currentVariant={currentVariant}
										placeholder="Select model..."
										loading={
											settings.llm.provider === "openrouter"
												? openRouterLoading
												: generalComputeLoading
										}
										className="w-full"
									/>
								</div>

								{/* Test Connection Button */}
								<div className="pt-2">
									<button
										type="button"
										onClick={handleTest}
										disabled={
											(!pendingLlmKey.trim() && !isLlmVaultConfigured) ||
											!llmKeyValidation.isValid ||
											testResult.status === "testing"
										}
										className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors disabled:opacity-40 cursor-pointer"
									>
										{testResult.status === "testing"
											? "Testing connection…"
											: "Test Connection"}
									</button>

									{testResult.status !== "idle" && (
										<p
											className={`text-xs mt-2 font-medium ${
												testResult.status === "success"
													? "text-emerald-500"
													: testResult.status === "error"
														? "text-rose-500"
														: "text-[var(--muted)]"
											}`}
										>
											{testResult.message}
										</p>
									)}
								</div>
							</div>
						)}

						{/* ── TAB 3: WEB SEARCH ── */}
						{activeTab === "search" && (
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											htmlFor="search-provider-select"
											className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
										>
											Search Engine Provider
										</label>
									</div>
									<select
										id="search-provider-select"
										value={settings.search.provider}
										onChange={(e) => {
											const prov = e.target.value as SearchProvider;
											setSearchProvider(prov);
											setPendingSearchKey("");
											setIsEditingSearchKey(false);
											const info = SEARCH_PROVIDERS.find((p) => p.id === prov);
											const hasKey =
												serverKeys.search.includes(prov) ||
												isSearchProviderConfigured(prov);
											if (!info?.requiredKey || hasKey) {
												triggerSaved();
											} else {
												setTimeout(() => searchInputRef.current?.focus(), 50);
											}
										}}
										className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none"
									>
										{SEARCH_PROVIDERS.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
									<p className="text-[11px] text-[var(--muted)] mt-1">
										{currentSearch.description}
									</p>
								</div>

								{currentSearch.requiredKey && (
									<div>
										<div className="flex items-center justify-between mb-1.5">
											<label
												htmlFor="search-api-key"
												className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
											>
												Search API Key
											</label>
											<div className="flex items-center gap-2">
												{isSearchVaultConfigured ? (
													<span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
														<CheckCircle2 className="w-3.5 h-3.5" /> Vault
														Encrypted
													</span>
												) : (
													<span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
														<AlertCircle className="w-3.5 h-3.5" /> Key Required
													</span>
												)}
												{currentSearch.apiKeyUrl && (
													<a
														href={currentSearch.apiKeyUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs text-emerald-500 hover:underline flex items-center gap-1"
													>
														Get key <ExternalLink className="w-3 h-3" />
													</a>
												)}
											</div>
										</div>
										<div className="flex gap-2">
											<div className="relative flex-1">
												<input
													ref={searchInputRef}
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
													}}
													placeholder={
														isSearchVaultConfigured
															? "•••••••••••••••• (Encrypted in Server Vault)"
															: `Enter ${currentSearch.name} API key (${getApiKeyPlaceholder(settings.search.provider)})`
													}
													className={`w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none font-mono ${
														pendingSearchKey.trim() &&
														!searchKeyValidation.isValid
															? "border-red-400 focus:ring-2 focus:ring-red-500/40"
															: "border-[var(--border)] focus:border-blue-500"
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
														).isValid || modalSearchSaving
													}
													onClick={async () => {
														const key = pendingSearchKey.trim();
														if (!key) return;
														const validation = validateApiKeyFormat(
															settings.search.provider,
															key,
														);
														if (!validation.isValid) return;
														setModalSearchSaving(true);
														try {
															await setSearchApiKeyForProvider(
																settings.search.provider,
																key,
															);
															setPendingSearchKey("");
															setIsEditingSearchKey(false);
															triggerSaved();
														} finally {
															setModalSearchSaving(false);
														}
													}}
													className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
												>
													{modalSearchSaving ? (
														<Loader2 className="w-3.5 h-3.5 animate-spin" />
													) : (
														<Save className="w-3.5 h-3.5" />
													)}
													Save Key
												</button>
											) : isSearchVaultConfigured ? (
												<button
													type="button"
													onClick={async () => {
														clearServerKey("search", settings.search.provider);
														await deleteServerApiKey(
															"search",
															settings.search.provider,
														).catch(() => {});
														setPendingSearchKey("");
														setIsEditingSearchKey(false);
														setTestResult({ status: "idle", message: "" });
														setTimeout(
															() => searchInputRef.current?.focus(),
															50,
														);
													}}
													className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
													title="Clear this API key to enter a new one"
												>
													<Trash2 className="w-3.5 h-3.5" />
													Clear
												</button>
											) : (
												<button
													type="button"
													disabled
													className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white opacity-40 cursor-not-allowed shadow-sm flex items-center gap-1.5 flex-shrink-0"
												>
													<Save className="w-3.5 h-3.5" />
													Save Key
												</button>
											)}
										</div>
										{pendingSearchKey.trim() &&
											!searchKeyValidation.isValid && (
												<p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
													<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
													{searchKeyValidation.error}
												</p>
											)}
									</div>
								)}

								<div>
									<label
										htmlFor="max-results-input"
										className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5"
									>
										Max Search Results (5 - 15)
									</label>
									<input
										id="max-results-input"
										type="number"
										min={3}
										max={20}
										value={settings.search.maxResults ?? 8}
										onChange={(e) => {
											setMaxResults(Number(e.target.value));
											triggerSaved();
										}}
										className="w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
									/>
								</div>
							</div>
						)}

						{/* ── TAB 4: DATA & STORAGE ── */}
						{activeTab === "data" && (
							<div className="divide-y divide-[var(--border)]">
								<div className="py-4 first:pt-0 flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Library Topics
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Total notes stored in SQLite database
										</p>
									</div>
									<span className="text-sm font-bold px-3 py-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
										{topics.length} Topics
									</span>
								</div>

								<div className="py-4 flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Database Engine
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											SQLite with Write-Ahead Logging (WAL mode)
										</p>
									</div>
									<span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
										data/ias.db
									</span>
								</div>

								<div className="py-4 flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Export All Notes
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Download entire library as a JSON backup
										</p>
									</div>
									<button
										type="button"
										onClick={() => {
											const dataStr =
												"data:text/json;charset=utf-8," +
												encodeURIComponent(JSON.stringify(topics, null, 2));
											const downloadAnchor = document.createElement("a");
											downloadAnchor.setAttribute("href", dataStr);
											downloadAnchor.setAttribute(
												"download",
												"ias_study_notes.json",
											);
											document.body.appendChild(downloadAnchor);
											downloadAnchor.click();
											downloadAnchor.remove();
										}}
										className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] transition-colors cursor-pointer"
									>
										Export JSON
									</button>
								</div>
							</div>
						)}

						{/* ── TAB 5: SECURITY & AUTH ── */}
						{activeTab === "security" && (
							<div className="divide-y divide-[var(--border)]">
								<div className="py-4 first:pt-0 flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Key Encryption Standard
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											AES-256-GCM symmetric encryption for stored keys
										</p>
									</div>
									<span className="flex items-center gap-1 text-xs font-bold text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40">
										<Shield className="w-3.5 h-3.5" /> Active
									</span>
								</div>

								<div className="py-4 flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-[var(--text)]">
											Authentication Mode
										</p>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											Local workspace mode (No external auth required)
										</p>
									</div>
									<span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
										Local Mode
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
