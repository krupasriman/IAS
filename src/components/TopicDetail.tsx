import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Flag,
	Lightbulb,
	Quote,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { Topic } from "../types/topic.types";

interface TopicDetailProps {
	topic: Topic;
}

function useCopy() {
	const [copied, setCopied] = useState<string | null>(null);
	const copy = (text: string, key: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(key);
			setTimeout(() => setCopied(null), 1500);
		});
	};
	return { copied, copy };
}

function SectionBlock({
	id,
	label,
	icon: Icon,
	iconColor,
	children,
}: {
	id: string;
	label: string;
	icon: React.ComponentType<{
		className?: string;
		style?: React.CSSProperties;
	}>;
	iconColor: string;
	children: React.ReactNode;
}) {
	return (
		<div
			id={id}
			className="p-5 sm:p-6 border-b border-[var(--border)] last:border-b-0"
		>
			<div className="flex items-center gap-2 mb-3">
				<Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
					{label}
				</span>
			</div>
			<div className="section-content text-[var(--text-2)]">{children}</div>
		</div>
	);
}

export default function TopicDetail({ topic }: TopicDetailProps) {
	const { copy, copied } = useCopy();

	const conclusionText =
		typeof topic.conclusion === "string"
			? topic.conclusion
			: `${topic.conclusion.negative} ${topic.conclusion.positive}`;

	return (
		<div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
			{/* ── Meaning ── */}
			<SectionBlock
				id="sec-meaning"
				label="Meaning & Context"
				icon={Lightbulb}
				iconColor="#10a37f"
			>
				<div className="copy-trigger relative group">
					<p className="text-base leading-relaxed text-[var(--text)]">
						{topic.meaning}
					</p>
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
						onClick={() => copy(topic.meaning, "meaning")}
						title="Copy Meaning"
					>
						{copied === "meaning" ? (
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Quote ── */}
			<SectionBlock
				id="sec-quote"
				label="Notable Quote / Context"
				icon={Quote}
				iconColor="#8b5cf6"
			>
				<div className="copy-trigger relative group">
					<div className="p-4 rounded-2xl bg-[var(--surface-2)] border-l-4 border-emerald-500">
						<p className="italic font-medium text-base leading-relaxed text-[var(--text)]">
							"{topic.quote.text}"
						</p>
						<p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
							— {topic.quote.source}
						</p>
					</div>
					<button
						type="button"
						className="copy-btn absolute top-2 right-2 p-1.5 rounded-lg text-xs bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer shadow-sm"
						onClick={() =>
							copy(`"${topic.quote.text}" — ${topic.quote.source}`, "quote")
						}
						title="Copy Quote"
					>
						{copied === "quote" ? (
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Pros & Cons Grid ── */}
			<div className="p-5 sm:p-6 border-b border-[var(--border)]">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* ── Advantages ── */}
					<div>
						<div className="flex items-center gap-2 mb-3.5">
							<TrendingUp className="w-4 h-4 text-emerald-500" />
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Key Advantages & Arguments
							</span>
						</div>
						{topic.pros && topic.pros.length > 0 ? (
							<ol className="space-y-3">
								{topic.pros.map((pro, i) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: stable list
										key={i}
										className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] flex gap-3 text-sm"
									>
										<span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
											{i + 1}
										</span>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-sm text-[var(--text)]">
												{pro.title}
											</p>
											<p className="text-xs leading-relaxed mt-1 text-[var(--text-2)]">
												{pro.explanation}
											</p>
											{pro.example && (
												<div className="text-[11px] mt-2 px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
													<span className="font-semibold text-emerald-600 dark:text-emerald-400">
														Eg:{" "}
													</span>
													{pro.example}
												</div>
											)}
										</div>
									</li>
								))}
							</ol>
						) : (
							<p className="text-xs italic text-[var(--faint)]">
								No advantages listed.
							</p>
						)}
					</div>

					{/* ── Challenges ── */}
					<div>
						<div className="flex items-center gap-2 mb-3.5">
							<AlertTriangle className="w-4 h-4 text-rose-500" />
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Challenges & Concerns
							</span>
						</div>
						{topic.cons && topic.cons.length > 0 ? (
							<ol className="space-y-3">
								{topic.cons.map((con, i) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: stable list
										key={i}
										className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] flex gap-3 text-sm"
									>
										<span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
											{i + 1}
										</span>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-sm text-[var(--text)]">
												{con.title}
											</p>
											<p className="text-xs leading-relaxed mt-1 text-[var(--text-2)]">
												{con.explanation}
											</p>
											{con.example && (
												<div className="text-[11px] mt-2 px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
													<span className="font-semibold text-rose-600 dark:text-rose-400">
														Eg:{" "}
													</span>
													{con.example}
												</div>
											)}
										</div>
									</li>
								))}
							</ol>
						) : (
							<p className="text-xs italic text-[var(--faint)]">
								No challenges listed.
							</p>
						)}
					</div>
				</div>
			</div>

			{/* ── Way Forward ── */}
			<SectionBlock
				id="sec-wayforward"
				label="Way Forward & Policy Reforms"
				icon={Flag}
				iconColor="#10a37f"
			>
				<div className="copy-trigger relative group">
					<ul className="space-y-2 text-sm leading-relaxed text-[var(--text)]">
						{Array.isArray(topic.wayForward) ? (
							topic.wayForward.map((step, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
								<li key={i} className="flex items-start gap-2.5">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
									<span className="flex-1">{step}</span>
								</li>
							))
						) : (
							<li className="flex items-start gap-2.5">
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
								<span className="flex-1">{topic.wayForward}</span>
							</li>
						)}
					</ul>
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
						onClick={() =>
							copy(
								Array.isArray(topic.wayForward)
									? topic.wayForward.map((s) => `- ${s}`).join("\n")
									: topic.wayForward,
								"way",
							)
						}
						title="Copy Way Forward"
					>
						{copied === "way" ? (
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Conclusion ── */}
			<SectionBlock
				id="sec-conclusion"
				label="Balanced Mains Conclusion"
				icon={CheckCircle2}
				iconColor="#f59e0b"
			>
				<div className="copy-trigger relative group">
					{typeof topic.conclusion === "string" ? (
						<p className="text-sm leading-relaxed text-[var(--text)] font-medium">
							{topic.conclusion}
						</p>
					) : (
						<div className="space-y-2 text-sm">
							<p className="leading-relaxed text-[var(--text-2)]">
								{topic.conclusion.negative}
							</p>
							<p className="font-semibold leading-relaxed text-[var(--text)]">
								{topic.conclusion.positive}
							</p>
						</div>
					)}
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
						onClick={() => copy(conclusionText, "conc")}
						title="Copy Conclusion"
					>
						{copied === "conc" ? (
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>
		</div>
	);
}
