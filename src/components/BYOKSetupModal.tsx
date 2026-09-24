import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Eye,
	EyeOff,
	Key,
	Loader2,
	Lock,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { LLM_PROVIDERS } from "../config/providers";
import { useSettingsStore } from "../stores/settingsStore";
import type { LLMProvider } from "../types/settings.types";
import {
	getApiKeyPlaceholder,
	validateApiKeyFormat,
} from "../utils/apiKeyValidator";

interface BYOKSetupModalProps {
	isOpen: boolean;
	onClose: () => void;
	canDismiss?: boolean;
}

export default function BYOKSetupModal({
	isOpen,
	onClose,
	canDismiss = true,
}: BYOKSetupModalProps) {
	const settings = useSettingsStore((s) => s.settings);
	const setLLMProvider = useSettingsStore((s) => s.setLLMProvider);
	const setLLMApiKeyForProvider = useSettingsStore(
		(s) => s.setLLMApiKeyForProvider,
	);

	const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
		settings.llm.provider || "openrouter",
	);
	const [apiKey, setApiKey] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const currentProviderInfo =
		LLM_PROVIDERS.find((p) => p.id === selectedProvider) ?? LLM_PROVIDERS[0];

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setSelectedProvider(settings.llm.provider || "openrouter");
			setApiKey("");
			setErrorMessage(null);
			setSuccessMessage(null);
			setIsValidating(false);
		}
	}, [isOpen, settings.llm.provider]);

	// Close on Escape if dismissible
	useEffect(() => {
		if (!isOpen || !canDismiss) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, canDismiss, onClose]);

	if (!isOpen) return null;

	const handleProviderChange = (prov: LLMProvider) => {
		setSelectedProvider(prov);
		setLLMProvider(prov);
		setErrorMessage(null);
		setSuccessMessage(null);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedKey = apiKey.trim();

		if (!trimmedKey) {
			setErrorMessage("Please enter an API key to continue.");
			return;
		}

		// Client format check
		const formatCheck = validateApiKeyFormat(selectedProvider, trimmedKey);
		if (!formatCheck.isValid) {
			setErrorMessage(formatCheck.error ?? "Invalid API key format.");
			return;
		}

		setIsValidating(true);
		setErrorMessage(null);
		setSuccessMessage(null);

		try {
			await setLLMApiKeyForProvider(selectedProvider, trimmedKey);
			setSuccessMessage(
				`Success! Your ${currentProviderInfo.name} API key is verified and encrypted.`,
			);
			setTimeout(() => {
				onClose();
			}, 900);
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Unable to verify API key with provider. Please verify your credentials.";
			setErrorMessage(msg);
		} finally {
			setIsValidating(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-labelledby="byok-title"
		>
			<div
				className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all flex flex-col z-10"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border)",
				}}
			>
				{/* Modal Header */}
				<div
					className="px-6 pt-6 pb-4 border-b flex items-start justify-between"
					style={{ borderColor: "var(--border)" }}
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20 shadow-sm">
							<Key className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2
									id="byok-title"
									className="text-lg font-semibold text-[var(--text)] tracking-tight"
								>
									Connect Your AI Key (BYOK)
								</h2>
								<span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
									<Lock className="w-3 h-3" />
									AES-256-GCM
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Scoped to your user account • Persists across devices
							</p>
						</div>
					</div>

					{canDismiss && (
						<button
							type="button"
							onClick={onClose}
							className="text-[var(--muted)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
							aria-label="Close dialog"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Modal Body */}
				<form onSubmit={handleSave} className="p-6 space-y-5">
					<div className="p-3.5 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)]/80 text-xs text-[var(--muted)] leading-relaxed flex items-start gap-2.5">
						<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
						<span>
							Your key is encrypted on the server using authenticated
							AES-256-GCM and never exposed to the browser. Log in from your
							phone, laptop, or tablet—your key follows your account
							automatically.
						</span>
					</div>

					{/* Provider Selection */}
					<div className="space-y-2">
						<span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider block">
							Select Provider
						</span>
						<div className="grid grid-cols-3 gap-2">
							{LLM_PROVIDERS.map((prov) => {
								const isSelected = selectedProvider === prov.id;
								return (
									<button
										key={prov.id}
										type="button"
										onClick={() => handleProviderChange(prov.id)}
										className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
											isSelected
												? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm ring-1 ring-[var(--accent)]/30"
												: "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--muted)]/50 hover:bg-[var(--surface-3)]"
										}`}
									>
										<span
											className={`text-xs font-semibold truncate ${
												isSelected
													? "text-[var(--accent)]"
													: "text-[var(--text)]"
											}`}
										>
											{prov.name}
										</span>
										<span className="text-[10px] text-[var(--muted)] mt-1 truncate">
											{prov.id === "openrouter"
												? "Free & 300+ models"
												: prov.id === "groq"
													? "Ultra-fast inference"
													: "High throughput"}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* API Key Input */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="byok-input"
								className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider"
							>
								{currentProviderInfo.name} API Key
							</label>
							<a
								href={currentProviderInfo.apiKeyUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
							>
								Get API Key
								<ExternalLink className="w-3 h-3" />
							</a>
						</div>

						<div className="relative">
							<input
								id="byok-input"
								type={showKey ? "text" : "password"}
								value={apiKey}
								onChange={(e) => {
									setApiKey(e.target.value);
									if (errorMessage) setErrorMessage(null);
								}}
								placeholder={getApiKeyPlaceholder(selectedProvider)}
								className="w-full px-3.5 py-2.5 pr-10 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all font-mono"
								autoComplete="off"
								spellCheck="false"
							/>
							<button
								type="button"
								onClick={() => setShowKey(!showKey)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
								tabIndex={-1}
								aria-label={showKey ? "Hide API key" : "Show API key"}
							>
								{showKey ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</button>
						</div>
						<p className="text-[11px] text-[var(--muted)]">
							{currentProviderInfo.description}
						</p>
					</div>

					{/* Error Alert */}
					{errorMessage && (
						<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-fadeIn">
							<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
							<span>{errorMessage}</span>
						</div>
					)}

					{/* Success Alert */}
					{successMessage && (
						<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5 animate-fadeIn">
							<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
							<span>{successMessage}</span>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-end gap-2.5 pt-2">
						{canDismiss && (
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-xl transition-colors cursor-pointer"
							>
								Browse Read-Only
							</button>
						)}

						<button
							type="submit"
							disabled={isValidating || !apiKey.trim()}
							className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
						>
							{isValidating ? (
								<>
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
									Verifying & Encrypting...
								</>
							) : (
								<>
									<Sparkles className="w-3.5 h-3.5" />
									Save & Connect Key
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
