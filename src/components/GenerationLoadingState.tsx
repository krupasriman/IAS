import {
	CheckCircle2,
	FileText,
	Globe,
	Loader2,
	Sparkles,
	X,
} from "lucide-react";
import type { GenerationProgress } from "../types/search.types";

interface GenerationLoadingStateProps {
	query: string;
	progress: GenerationProgress;
	webEnabled: boolean;
	onCancel?: () => void;
}

export default function GenerationLoadingState({
	query,
	progress,
	webEnabled,
	onCancel,
}: GenerationLoadingStateProps) {
	const stage = progress.stage;

	// Compute status for the 3 steps
	const step1Active = stage === "searching_web";
	const step1Done =
		stage === "processing_llm" ||
		stage === "generating" ||
		stage === "streaming_llm" ||
		stage === "validating";

	const step2Active =
		stage === "processing_llm" ||
		stage === "generating" ||
		stage === "streaming_llm";
	const step2Done = stage === "validating";

	const step3Active = stage === "validating";

	return (
		<div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
			{/* Top Header Card */}
			<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm relative overflow-hidden mb-6">
				{/* Ambient Background Gradient Glow */}
				<div
					className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
					aria-hidden="true"
				/>

				<div className="relative z-10">
					{/* Status Bar */}
					<div className="flex items-center justify-between gap-4 mb-4">
						<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
							<Sparkles className="w-3.5 h-3.5 animate-spin duration-3000" />
							<span>Synthesizing UPSC Study Note</span>
						</div>

						{onCancel && (
							<button
								type="button"
								onClick={onCancel}
								className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
								title="Cancel generation"
							>
								<X className="w-3.5 h-3.5" />
								<span>Cancel</span>
							</button>
						)}
					</div>

					{/* Topic Title */}
					<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text)] mb-3 leading-snug">
						"{query || "UPSC Topic"}"
					</h2>

					<p className="text-sm text-[var(--muted)] mb-6">
						Building a comprehensive 5-part analytical note adhering strictly to
						the UPSC Mains answer-writing framework.
					</p>

					{/* Live Activity Stepper (ChatGPT Style) */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-[var(--border)]">
						{/* Step 1: Web Research */}
						<div
							className={`p-3.5 rounded-2xl border transition-all duration-300 ${
								step1Active
									? "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200 shadow-xs"
									: step1Done
										? "bg-[var(--surface-2)] border-[var(--border)] opacity-90"
										: "bg-[var(--surface)] border-dashed border-[var(--border)] opacity-60"
							}`}
						>
							<div className="flex items-center gap-2.5 mb-1.5">
								{step1Active ? (
									<Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
								) : step1Done ? (
									<CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
								) : (
									<Globe className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
								)}
								<span className="text-xs font-semibold">
									{webEnabled ? "Live Web Research" : "Knowledge Base"}
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								{step1Active
									? "Searching real-time facts, stats & schemes..."
									: step1Done
										? "Latest facts & background gathered"
										: "Gathering current affairs context"}
							</p>
						</div>

						{/* Step 2: AI Synthesis */}
						<div
							className={`p-3.5 rounded-2xl border transition-all duration-300 ${
								step2Active
									? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-xs"
									: step2Done
										? "bg-[var(--surface-2)] border-[var(--border)] opacity-90"
										: "bg-[var(--surface)] border-dashed border-[var(--border)] opacity-60"
							}`}
						>
							<div className="flex items-center gap-2.5 mb-1.5">
								{step2Active ? (
									<Loader2 className="w-4 h-4 animate-spin text-emerald-500 flex-shrink-0" />
								) : step2Done ? (
									<CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
								) : (
									<Sparkles className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
								)}
								<span className="text-xs font-semibold">AI Synthesis</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								{step2Active
									? "Drafting Meaning, Quote, Pros, Cons & Solutions..."
									: step2Done
										? "5-part dossier synthesized"
										: "Synthesizing analytical arguments"}
							</p>
						</div>

						{/* Step 3: IAS Schema Validation */}
						<div
							className={`p-3.5 rounded-2xl border transition-all duration-300 ${
								step3Active
									? "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200 shadow-xs"
									: "bg-[var(--surface)] border-dashed border-[var(--border)] opacity-60"
							}`}
						>
							<div className="flex items-center gap-2.5 mb-1.5">
								{step3Active ? (
									<Loader2 className="w-4 h-4 animate-spin text-purple-500 flex-shrink-0" />
								) : (
									<FileText className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
								)}
								<span className="text-xs font-semibold">
									Mains Rubric Check
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] leading-relaxed">
								{step3Active
									? "Verifying word limits & balanced pivot..."
									: "Strict 5-part Mains formatting"}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Document Skeleton Preview (Simulates UPSC 5-Part Document being built) */}
			<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-6 opacity-70 animate-pulse">
				{/* Top metadata skeleton */}
				<div className="flex items-center gap-3">
					<div className="h-6 w-24 rounded-full bg-[var(--surface-3)]" />
					<div className="h-6 w-20 rounded-full bg-[var(--surface-3)]" />
					<div className="h-6 w-28 rounded-full bg-[var(--surface-3)]" />
				</div>

				{/* Title skeleton */}
				<div className="space-y-2">
					<div className="h-8 w-3/4 rounded-xl bg-[var(--surface-3)]" />
					<div className="h-4 w-1/3 rounded-lg bg-[var(--surface-2)]" />
				</div>

				{/* 1. Meaning Skeleton Card */}
				<div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 space-y-2.5">
					<div className="h-4 w-28 rounded-md bg-[var(--surface-3)]" />
					<div className="h-3 w-full rounded bg-[var(--surface-3)]/60" />
					<div className="h-3 w-5/6 rounded bg-[var(--surface-3)]/60" />
				</div>

				{/* 2. Quote Skeleton Card */}
				<div className="p-4 rounded-2xl border-l-4 border-emerald-500/40 bg-[var(--surface-2)]/30 space-y-2">
					<div className="h-4 w-20 rounded-md bg-[var(--surface-3)]" />
					<div className="h-3 w-4/5 rounded bg-[var(--surface-3)]/60 italic" />
					<div className="h-2.5 w-32 rounded bg-[var(--surface-3)]/40 ml-auto" />
				</div>

				{/* 3. Pros & Cons Skeleton Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Pros column */}
					<div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
						<div className="h-4 w-24 rounded-md bg-emerald-500/20" />
						<div className="h-14 rounded-xl bg-[var(--surface-3)]/40" />
						<div className="h-14 rounded-xl bg-[var(--surface-3)]/40" />
					</div>
					{/* Cons column */}
					<div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
						<div className="h-4 w-24 rounded-md bg-rose-500/20" />
						<div className="h-14 rounded-xl bg-[var(--surface-3)]/40" />
						<div className="h-14 rounded-xl bg-[var(--surface-3)]/40" />
					</div>
				</div>

				{/* 4. Way Forward Skeleton */}
				<div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 space-y-2.5">
					<div className="h-4 w-32 rounded-md bg-[var(--surface-3)]" />
					<div className="h-3 w-full rounded bg-[var(--surface-3)]/60" />
					<div className="h-3 w-11/12 rounded bg-[var(--surface-3)]/60" />
				</div>
			</div>
		</div>
	);
}
