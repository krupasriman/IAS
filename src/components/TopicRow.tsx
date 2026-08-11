import { FileText, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Topic } from "../types/topic.types";
import { validateTopic } from "../utils/validator";

const CAT_COLORS: Record<string, string> = {
	Polity: "#3b82f6",
	Governance: "#6366f1",
	Economy: "#10b981",
	Society: "#a855f7",
	IR: "#0ea5e9",
	Ethics: "#f59e0b",
	Geography: "#14b8a6",
	Environment: "#22c55e",
	"Science & Tech": "#06b6d4",
	History: "#f97316",
};

const CAT_SHORT: Record<string, string> = {
	Polity: "Polity",
	Governance: "Gov",
	Economy: "Eco",
	Society: "Soc",
	IR: "IR",
	Ethics: "Ethics",
	Geography: "Geo",
	Environment: "Env",
	"Science & Tech": "S&T",
	History: "Hist",
};

interface TopicRowProps {
	topic: Topic;
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("en-IN", {
			day: "numeric",
			month: "short",
		});
	} catch {
		return "";
	}
}

export default function TopicRow({ topic }: TopicRowProps) {
	const navigate = useNavigate();
	const dotColor = CAT_COLORS[topic.category] ?? "var(--accent)";
	const validation = validateTopic(topic);

	const scoreColor =
		validation.score >= 80
			? "var(--success)"
			: validation.score >= 50
				? "var(--warn)"
				: "var(--danger)";

	return (
		<button
			type="button"
			className="topic-row w-full text-left"
			onClick={() => navigate(`/topic/${topic.id}`)}
			aria-label={`Open ${topic.title}`}
		>
			{/* Category dot */}
			<span
				className="w-2 h-2 rounded-full flex-shrink-0"
				style={{ background: dotColor }}
				title={topic.category}
			/>

			{/* Title */}
			<span
				className="flex-1 text-sm font-medium truncate min-w-0"
				style={{ color: "var(--text)" }}
			>
				{topic.title}
			</span>

			{/* Category pill - hidden on small */}
			<span
				className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
				style={{
					background: `${dotColor}18`,
					color: dotColor,
				}}
			>
				{CAT_SHORT[topic.category] ?? topic.category}
			</span>

			{/* Source icon */}
			<span
				className="flex-shrink-0"
				style={{ color: "var(--faint)" }}
				title={topic.source === "web" ? "AI Generated" : "Local"}
			>
				{topic.source === "web" ? (
					<Globe className="w-3 h-3" />
				) : (
					<FileText className="w-3 h-3" />
				)}
			</span>

			{/* Score */}
			<span
				className="hidden sm:block text-[11px] font-semibold flex-shrink-0 w-8 text-right"
				style={{ color: scoreColor }}
			>
				{validation.score}%
			</span>

			{/* Date */}
			<span
				className="hidden lg:block text-[11px] flex-shrink-0 w-16 text-right"
				style={{ color: "var(--faint)" }}
			>
				{formatDate(topic.updatedAt)}
			</span>
		</button>
	);
}
