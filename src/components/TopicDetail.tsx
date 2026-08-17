import {
	AlertTriangle,
	BookOpen,
	Check,
	CheckCircle2,
	Compass,
	Copy,
	Flag,
	Quote,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { WebSearchResultItem } from "../types/search.types";
import type { Topic } from "../types/topic.types";
import { matchContextSources } from "../utils/sourceHelpers";
import { cleanText, formatFullTopicPlainText } from "../utils/textHelpers";
import { SourcePill } from "./SourceCitation";

interface TopicDetailProps {
	topic: Topic;
	sources?: WebSearchResultItem[];
}

function useCopy() {
	const [copied, setCopied] = useState<string | null>(null);
	const copy = (text: string, key: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(key);
			setTimeout(() => setCopied(null), 1800);
		});
	};
	return { copied, copy };
}

export default function TopicDetail({ topic, sources }: TopicDetailProps) {
	const { copied, copy } = useCopy();

	const conclusionText =
		typeof topic.conclusion === "string"
			? topic.conclusion
			: `${topic.conclusion?.negative || ""} ${topic.conclusion?.positive || ""}`;

	const meaningSources = sources?.length
		? matchContextSources(topic.meaning, sources, 0)
		: [];
	const quoteSources = sources?.length
		? matchContextSources(
				`${topic.quote?.text || ""} ${topic.quote?.source || ""}`,
				sources,
				1,
			)
		: [];
	const concSources = sources?.length
		? matchContextSources(conclusionText, sources, 0)
		: [];

	const scrollTo = (id: string) => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<div className="divide-y divide-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
			{/* ── Document Sub-Toolbar & Quick Jump Navigation ── */}
			<div className="px-4 sm:px-6 py-2.5 bg-[var(--surface-2)]/40 flex items-center justify-between gap-3 flex-wrap border-b border-[var(--border)] text-xs">
				<div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
					<button
						type="button"
						onClick={() => scrollTo("sec-meaning")}
						className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer whitespace-nowrap"
					>
						Overview
					</button>
					<span className="text-[var(--border)]">·</span>
					<button
						type="button"
						onClick={() => scrollTo("sec-quote")}
						className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer whitespace-nowrap"
					>
						Quote
					</button>
					<span className="text-[var(--border)]">·</span>
					<button
						type="button"
						onClick={() => scrollTo("sec-analysis")}
						className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer whitespace-nowrap"
					>
						Arguments & Dimensions
					</button>
					<span className="text-[var(--border)]">·</span>
					<button
						type="button"
						onClick={() => scrollTo("sec-wayforward")}
						className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer whitespace-nowrap"
					>
						Roadmap
					</button>
					<span className="text-[var(--border)]">·</span>
					<button
						type="button"
						onClick={() => scrollTo("sec-conclusion")}
						className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer whitespace-nowrap"
					>
						Synthesis
					</button>
				</div>

				<div className="flex items-center gap-2 ml-auto">
					<button
						type="button"
						onClick={() => copy(formatFullTopicPlainText(topic), "all-clean")}
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all cursor-pointer shadow-xs"
						title="Copy clear plain text notes"
					>
						{copied === "all-clean" ? (
							<>
								<Check className="w-3.5 h-3.5 text-emerald-500" />
								<span className="text-emerald-600 dark:text-emerald-400 font-semibold">
									Copied!
								</span>
							</>
						) : (
							<>
								<Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
								<span>Copy Note</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* ── SECTION 1: Meaning & Conceptual Core ── */}
			<div id="sec-meaning" className="p-6 sm:p-8 relative group">
				<div className="flex items-center justify-between gap-3 mb-3.5">
					<div className="flex items-center gap-2">
						<Compass className="w-4 h-4 text-[var(--muted)]" />
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Conceptual Foundation & Core Meaning
						</h2>
					</div>
					<button
						type="button"
						className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
						onClick={() => copy(cleanText(topic.meaning), "meaning")}
						title="Copy meaning"
					>
						{copied === "meaning" ? (
							<Check className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>

				<div className="relative pl-3.5 border-l-2 border-[var(--border-strong)]">
					<p className="text-[15px] sm:text-base leading-relaxed text-[var(--text)] font-normal">
						{topic.meaning}
						{meaningSources.length > 0 && (
							<SourcePill
								sources={meaningSources}
								className="ml-2 align-middle inline-flex"
							/>
						)}
					</p>
				</div>
			</div>

			{/* ── SECTION 2: Notable Quote & Contextual Hook ── */}
			{topic.quote?.text && (
				<div
					id="sec-quote"
					className="p-6 sm:p-8 bg-[var(--surface-2)]/20 relative group"
				>
					<div className="flex items-center justify-between gap-3 mb-3">
						<div className="flex items-center gap-2">
							<Quote className="w-4 h-4 text-[var(--muted)]" />
							<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Notable Quotation & Analytical Anchor
							</h2>
						</div>
						<button
							type="button"
							className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer border border-[var(--border)] shadow-xs"
							onClick={() =>
								copy(
									`"${cleanText(topic.quote.text)}" - ${cleanText(topic.quote.source)}`,
									"quote",
								)
							}
							title="Copy quote"
						>
							{copied === "quote" ? (
								<Check className="w-3.5 h-3.5 text-emerald-500" />
							) : (
								<Copy className="w-3.5 h-3.5" />
							)}
						</button>
					</div>

					<div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 shadow-xs">
						<p className="font-serif italic text-base sm:text-lg leading-relaxed text-[var(--text)]">
							"{topic.quote.text}"
						</p>
						<div className="mt-3.5 flex items-center flex-wrap gap-2.5 pt-3 border-t border-[var(--border)]">
							<span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] bg-[var(--surface-2)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
								<span>—</span>
								<span className="text-[var(--text-2)] font-semibold">
									{topic.quote.source}
								</span>
							</span>
							{quoteSources.length > 0 && (
								<SourcePill
									sources={quoteSources}
									className="align-middle inline-flex"
								/>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ── SECTION 3: Multi-Dimensional Analysis (Pros & Cons) ── */}
			<div id="sec-analysis" className="p-6 sm:p-8">
				<div className="mb-6">
					<div className="flex items-center gap-2 mb-1">
						<BookOpen className="w-4 h-4 text-[var(--muted)]" />
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Multi-Dimensional Analysis & Arguments
						</h2>
					</div>
					<p className="text-xs text-[var(--muted)] ml-6">
						Structured examination of core arguments, opportunities, and
						critical systemic bottlenecks.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
					{/* ── Key Arguments (Pros) ── */}
					<div className="space-y-3.5">
						<div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
							<div className="flex items-center gap-2">
								<TrendingUp className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
									Key Dimensions & Opportunities
								</span>
							</div>
							{topic.pros && (
								<span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
									{topic.pros.length} Points
								</span>
							)}
						</div>

						{topic.pros && topic.pros.length > 0 ? (
							<div className="space-y-3">
								{topic.pros.map((pro, i) => {
									const proSources = sources?.length
										? matchContextSources(
												`${pro.title} ${pro.explanation} ${pro.example || ""}`,
												sources,
												2 + i,
											)
										: [];
									const copyKey = `pro-${i}`;
									return (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: stable list
											key={i}
											className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60 hover:border-[var(--border-strong)] transition-all relative group"
										>
											<div className="flex items-start justify-between gap-2 mb-1.5">
												<div className="flex items-center gap-2">
													<span className="text-xs font-mono font-bold text-[var(--muted)]">
														{String(i + 1).padStart(2, "0")}
													</span>
													<h3 className="font-semibold text-sm text-[var(--text)]">
														{pro.title}
													</h3>
												</div>
												<button
													type="button"
													className="opacity-0 group-hover:opacity-100 p-1 rounded text-xs text-[var(--muted)] hover:text-[var(--text)] transition-opacity cursor-pointer"
													onClick={() =>
														copy(
															`${cleanText(pro.title)}\n${cleanText(pro.explanation)}${pro.example ? `\nExample: ${cleanText(pro.example)}` : ""}`,
															copyKey,
														)
													}
													title="Copy argument"
												>
													{copied === copyKey ? (
														<Check className="w-3.5 h-3.5 text-emerald-500" />
													) : (
														<Copy className="w-3.5 h-3.5" />
													)}
												</button>
											</div>

											<p className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-2)] pl-5">
												{pro.explanation}
												{proSources.length > 0 && (
													<SourcePill
														sources={proSources}
														className="ml-1.5 align-middle inline-flex"
													/>
												)}
											</p>

											{pro.example && (
												<div className="mt-3 ml-5 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-2 text-xs">
													<span className="inline-flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider text-[var(--text-2)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] flex-shrink-0 mt-0.5">
														<Sparkles className="w-3 h-3 text-[var(--muted)]" />
														Case in Point
													</span>
													<span className="text-xs text-[var(--text-2)] leading-relaxed flex-1">
														{pro.example}
													</span>
												</div>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-xs italic text-[var(--faint)]">
								No specific advantages recorded.
							</p>
						)}
					</div>

					{/* ── Critical Challenges (Cons) ── */}
					<div className="space-y-3.5">
						<div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
									Critical Challenges & Concerns
								</span>
							</div>
							{topic.cons && (
								<span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
									{topic.cons.length} Points
								</span>
							)}
						</div>

						{topic.cons && topic.cons.length > 0 ? (
							<div className="space-y-3">
								{topic.cons.map((con, i) => {
									const conSources = sources?.length
										? matchContextSources(
												`${con.title} ${con.explanation} ${con.example || ""}`,
												sources,
												2 + (topic.pros?.length || 4) + i,
											)
										: [];
									const copyKey = `con-${i}`;
									return (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: stable list
											key={i}
											className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60 hover:border-[var(--border-strong)] transition-all relative group"
										>
											<div className="flex items-start justify-between gap-2 mb-1.5">
												<div className="flex items-center gap-2">
													<span className="text-xs font-mono font-bold text-[var(--muted)]">
														{String(i + 1).padStart(2, "0")}
													</span>
													<h3 className="font-semibold text-sm text-[var(--text)]">
														{con.title}
													</h3>
												</div>
												<button
													type="button"
													className="opacity-0 group-hover:opacity-100 p-1 rounded text-xs text-[var(--muted)] hover:text-[var(--text)] transition-opacity cursor-pointer"
													onClick={() =>
														copy(
															`${cleanText(con.title)}\n${cleanText(con.explanation)}${con.example ? `\nExample: ${cleanText(con.example)}` : ""}`,
															copyKey,
														)
													}
													title="Copy challenge"
												>
													{copied === copyKey ? (
														<Check className="w-3.5 h-3.5 text-emerald-500" />
													) : (
														<Copy className="w-3.5 h-3.5" />
													)}
												</button>
											</div>

											<p className="text-xs sm:text-[13px] leading-relaxed text-[var(--text-2)] pl-5">
												{con.explanation}
												{conSources.length > 0 && (
													<SourcePill
														sources={conSources}
														className="ml-1.5 align-middle inline-flex"
													/>
												)}
											</p>

											{con.example && (
												<div className="mt-3 ml-5 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-2 text-xs">
													<span className="inline-flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider text-[var(--text-2)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] flex-shrink-0 mt-0.5">
														<AlertTriangle className="w-3 h-3 text-[var(--muted)]" />
														Ground Reality
													</span>
													<span className="text-xs text-[var(--text-2)] leading-relaxed flex-1">
														{con.example}
													</span>
												</div>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-xs italic text-[var(--faint)]">
								No specific challenges recorded.
							</p>
						)}
					</div>
				</div>
			</div>

			{/* ── SECTION 4: Strategic Roadmap & Policy Reforms (Way Forward) ── */}
			<div id="sec-wayforward" className="p-6 sm:p-8 relative group">
				<div className="flex items-center justify-between gap-3 mb-5">
					<div className="flex items-center gap-2">
						<Flag className="w-4 h-4 text-[var(--muted)]" />
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Strategic Roadmap & Policy Reforms
						</h2>
					</div>
					<button
						type="button"
						className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
						onClick={() =>
							copy(
								Array.isArray(topic.wayForward)
									? topic.wayForward
											.map((s, i) => `${i + 1}. ${cleanText(s)}`)
											.join("\n")
									: cleanText(topic.wayForward),
								"way",
							)
						}
						title="Copy roadmap"
					>
						{copied === "way" ? (
							<Check className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>

				<div className="space-y-3">
					{Array.isArray(topic.wayForward) ? (
						topic.wayForward.map((step, i) => {
							const wfSources = sources?.length
								? matchContextSources(step, sources, i + 1)
								: [];
							return (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: stable list
									key={i}
									className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60 transition-colors flex items-start gap-3.5"
								>
									<span className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-2)] flex-shrink-0 mt-0.5 shadow-xs">
										{i + 1}
									</span>
									<div className="flex-1 min-w-0">
										<p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
											{step}
											{wfSources.length > 0 && (
												<SourcePill
													sources={wfSources}
													className="ml-2 align-middle inline-flex"
												/>
											)}
										</p>
									</div>
								</div>
							);
						})
					) : (
						<div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 flex items-start gap-3.5">
							<span className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-2)] flex-shrink-0 mt-0.5 shadow-xs">
								1
							</span>
							<p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
								{topic.wayForward}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* ── SECTION 5: Balanced Mains Synthesis (Conclusion) ── */}
			<div
				id="sec-conclusion"
				className="p-6 sm:p-8 pb-10 sm:pb-12 bg-[var(--surface-2)]/20 relative group"
			>
				<div className="flex items-center justify-between gap-3 mb-4">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--muted)]" />
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Balanced Synthesis & Evaluative Judgement
						</h2>
					</div>
					<button
						type="button"
						className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer shadow-xs"
						onClick={() =>
							copy(
								typeof topic.conclusion === "string"
									? cleanText(topic.conclusion)
									: `${cleanText(topic.conclusion.negative)}\n${cleanText(topic.conclusion.positive)}`,
								"conc",
							)
						}
						title="Copy conclusion"
					>
						{copied === "conc" ? (
							<Check className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>

				<div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
					{typeof topic.conclusion === "string" ? (
						<p className="text-xs sm:text-sm leading-relaxed text-[var(--text)] font-medium">
							{topic.conclusion}
							{concSources.length > 0 && (
								<SourcePill
									sources={concSources}
									className="ml-2 align-middle inline-flex"
								/>
							)}
						</p>
					) : (
						<div className="space-y-3.5">
							{/* Pragmatic Bottleneck / Negative aspect */}
							<div className="p-4 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] text-xs sm:text-[13px] leading-relaxed text-[var(--text-2)]">
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Pragmatic Ground Reality / Constraint
								</span>
								<p>{topic.conclusion.negative}</p>
							</div>

							{/* Forward Vision / Positive synthesis */}
							<div className="p-4 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] text-xs sm:text-[13px] leading-relaxed text-[var(--text)] font-medium">
								<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-2)] block mb-1">
									Strategic Forward Vision
								</span>
								<p>
									{topic.conclusion.positive}
									{concSources.length > 0 && (
										<SourcePill
											sources={concSources}
											className="ml-2 align-middle inline-flex"
										/>
									)}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
