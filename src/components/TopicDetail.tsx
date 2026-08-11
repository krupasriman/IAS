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
		<div id={id} className="mb-6">
			<div
				className="flex items-center gap-2.5 px-5 py-3 border-b"
				style={{ borderColor: "var(--border)", background: "var(--surface)" }}
			>
				<Icon className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
				<span
					className="text-base font-bold uppercase tracking-wider"
					style={{ color: "var(--muted)" }}
				>
					{label}
				</span>
			</div>
			<div className="section-content p-5 bg-transparent">{children}</div>
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
		<div className="ws-section">
			{/* ── Meaning ── */}
			<SectionBlock
				id="sec-meaning"
				label="Meaning"
				icon={Lightbulb}
				iconColor="var(--accent)"
			>
				<div className="copy-trigger relative group">
					<p
						className="text-base leading-relaxed"
						style={{ color: "var(--text-2)" }}
					>
						{topic.meaning}
					</p>
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1 rounded text-xs"
						style={{ color: "var(--muted)", background: "var(--surface-2)" }}
						onClick={() => copy(topic.meaning, "meaning")}
						title="Copy"
					>
						{copied === "meaning" ? (
							<CheckCircle2
								className="w-3.5 h-3.5"
								style={{ color: "var(--success)" }}
							/>
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Quote ── */}
			<SectionBlock
				id="sec-quote"
				label="Quote"
				icon={Quote}
				iconColor="#a855f7"
			>
				<div className="copy-trigger relative group">
					<div
						className="ws-quote p-4 rounded-lg"
						style={{ background: "var(--surface-2)" }}
					>
						<p
							className="italic font-medium text-base leading-relaxed"
							style={{
								color: "var(--text)",
							}}
						>
							"{topic.quote.text}"
						</p>
						<p
							className="mt-2 text-sm font-bold"
							style={{ color: "var(--accent)" }}
						>
							— {topic.quote.source}
						</p>
					</div>
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1 rounded text-xs"
						style={{ color: "var(--muted)", background: "var(--surface-2)" }}
						onClick={() =>
							copy(`"${topic.quote.text}" — ${topic.quote.source}`, "quote")
						}
						title="Copy"
					>
						{copied === "quote" ? (
							<CheckCircle2
								className="w-3.5 h-3.5"
								style={{ color: "var(--success)" }}
							/>
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Pros & Cons Grid ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* ── Pros ── */}
				<SectionBlock
					id="sec-pros"
					label="Advantages"
					icon={TrendingUp}
					iconColor="var(--success)"
				>
					{topic.pros && topic.pros.length > 0 ? (
						<ol className="space-y-4">
							{topic.pros.map((pro, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static list
								<li key={i} className="flex gap-3 text-base">
									<span
										className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs font-black mt-0.5"
										style={{
											background: "var(--success-bg)",
											color: "var(--success)",
										}}
									>
										{i + 1}
									</span>
									<div className="min-w-0 flex-1">
										<p
											className="font-bold text-base"
											style={{ color: "var(--text)" }}
										>
											{pro.title}
										</p>
										<p
											className="text-sm leading-relaxed mt-1"
											style={{ color: "var(--text-2)" }}
										>
											{pro.explanation}
										</p>
										{pro.example && (
											<p
												className="text-sm mt-2 px-3 py-1.5 rounded-md"
												style={{
													background: "var(--surface-2)",
													color: "var(--muted)",
												}}
											>
												<span
													className="font-bold"
													style={{ color: "var(--success)" }}
												>
													Eg:{" "}
												</span>
												{pro.example}
											</p>
										)}
									</div>
								</li>
							))}
						</ol>
					) : (
						<p className="text-sm italic" style={{ color: "var(--faint)" }}>
							No advantages listed.
						</p>
					)}
				</SectionBlock>

				{/* ── Cons ── */}
				<SectionBlock
					id="sec-cons"
					label="Challenges"
					icon={AlertTriangle}
					iconColor="var(--danger)"
				>
					{topic.cons && topic.cons.length > 0 ? (
						<ol className="space-y-4">
							{topic.cons.map((con, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static list
								<li key={i} className="flex gap-3 text-base">
									<span
										className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs font-black mt-0.5"
										style={{
											background: "var(--danger-bg)",
											color: "var(--danger)",
										}}
									>
										{i + 1}
									</span>
									<div className="min-w-0 flex-1">
										<p
											className="font-bold text-base"
											style={{ color: "var(--text)" }}
										>
											{con.title}
										</p>
										<p
											className="text-sm leading-relaxed mt-1"
											style={{ color: "var(--text-2)" }}
										>
											{con.explanation}
										</p>
										{con.example && (
											<p
												className="text-sm mt-2 px-3 py-1.5 rounded-md"
												style={{
													background: "var(--surface-2)",
													color: "var(--muted)",
												}}
											>
												<span
													className="font-bold"
													style={{ color: "var(--danger)" }}
												>
													Eg:{" "}
												</span>
												{con.example}
											</p>
										)}
									</div>
								</li>
							))}
						</ol>
					) : (
						<p className="text-sm italic" style={{ color: "var(--faint)" }}>
							No challenges listed.
						</p>
					)}
				</SectionBlock>
			</div>

			{/* ── Way Forward ── */}
			<SectionBlock
				id="sec-wayforward"
				label="Way Forward"
				icon={Flag}
				iconColor="var(--accent)"
			>
				<div className="copy-trigger relative group">
					<ul
						className="list-disc pl-5 space-y-2.5 text-base leading-relaxed"
						style={{ color: "var(--text-2)" }}
					>
						{Array.isArray(topic.wayForward) ? (
							topic.wayForward.map((step, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
								<li key={i}>{step}</li>
							))
						) : (
							<li>{topic.wayForward}</li>
						)}
					</ul>
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1 rounded text-xs"
						style={{ color: "var(--muted)", background: "var(--surface-2)" }}
						onClick={() =>
							copy(
								Array.isArray(topic.wayForward)
									? topic.wayForward.map((s) => `- ${s}`).join("\n")
									: topic.wayForward,
								"way",
							)
						}
						title="Copy"
					>
						{copied === "way" ? (
							<CheckCircle2
								className="w-3.5 h-3.5"
								style={{ color: "var(--success)" }}
							/>
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>

			{/* ── Conclusion ── */}
			<SectionBlock
				id="sec-conclusion"
				label="Conclusion"
				icon={CheckCircle2}
				iconColor="var(--warn)"
			>
				<div className="copy-trigger relative group">
					{typeof topic.conclusion === "string" ? (
						<p
							className="text-base leading-relaxed"
							style={{ color: "var(--text-2)" }}
						>
							{topic.conclusion}
						</p>
					) : (
						<div className="space-y-3">
							<p
								className="text-base leading-relaxed"
								style={{ color: "var(--text-2)" }}
							>
								{topic.conclusion.negative}
							</p>
							<p
								className="text-base font-semibold leading-relaxed"
								style={{ color: "var(--text)" }}
							>
								{topic.conclusion.positive}
							</p>
						</div>
					)}
					<button
						type="button"
						className="copy-btn absolute top-0 right-0 p-1 rounded text-xs"
						style={{ color: "var(--muted)", background: "var(--surface-2)" }}
						onClick={() => copy(conclusionText, "conc")}
						title="Copy"
					>
						{copied === "conc" ? (
							<CheckCircle2
								className="w-3.5 h-3.5"
								style={{ color: "var(--success)" }}
							/>
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			</SectionBlock>
		</div>
	);
}
