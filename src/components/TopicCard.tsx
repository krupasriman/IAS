import { ArrowRight, Clock, FileText, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import type { Topic } from "../types/topic.types";
import { getCategoryInfo } from "../utils/categoryHelpers";

interface TopicCardProps {
	topic: Topic;
}

export default function TopicCard({ topic }: TopicCardProps) {
	const categoryInfo = getCategoryInfo(topic.category);
	const Icon = categoryInfo.icon;

	const preview = topic.meaning?.slice(0, 110) || "No meaning available";

	return (
		<Link
			to={`/topic/${topic.id}`}
			className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden"
		>
			{/* Top accent */}
			<div
				className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${categoryInfo.gradient}`}
			/>

			<div className="flex items-start justify-between gap-3 mb-3">
				<span
					className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${categoryInfo.bgLight}`}
				>
					<Icon className="w-3.5 h-3.5" />
					{topic.category}
				</span>

				<span
					className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
						topic.source === "web"
							? "bg-purple-50 text-purple-600"
							: "bg-emerald-50 text-emerald-600"
					}`}
				>
					{topic.source === "web" ? (
						<Globe className="w-3 h-3" />
					) : (
						<FileText className="w-3 h-3" />
					)}
					{topic.source === "web" ? "Web" : "Local"}
				</span>
			</div>

			<h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-blue-700 transition-colors line-clamp-2">
				{topic.title}
			</h3>

			<p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
				{preview}...
			</p>

			<div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
				<span className="text-xs text-slate-400 flex items-center gap-1">
					<Clock className="w-3 h-3" />
					{formatDate(topic.updatedAt)}
				</span>
				<span className="flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
					Read <ArrowRight className="w-3.5 h-3.5" />
				</span>
			</div>
		</Link>
	);
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("en-IN", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	} catch {
		return "";
	}
}
