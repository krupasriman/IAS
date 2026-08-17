import { AlertCircle, ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopicDetail from "../components/TopicDetail";
import { useTopics } from "../hooks/useTopics";
import { getDefaultCategorySources } from "../utils/referenceSources";

export default function TopicPage() {
	const { id } = useParams<{ id: string }>();
	const { loading, getTopic, deleteTopic } = useTopics();
	const navigate = useNavigate();

	const topic = id ? getTopic(id) : undefined;

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2
					className="w-8 h-8 animate-spin"
					style={{ color: "var(--accent)" }}
				/>
			</div>
		);
	}

	if (!topic) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
				<AlertCircle
					className="w-12 h-12"
					style={{ color: "var(--surface-3)" }}
				/>
				<h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
					Topic not found
				</h2>
				<p className="text-sm" style={{ color: "var(--muted)" }}>
					This topic may have been deleted or the URL is incorrect.
				</p>
				<Link
					to="/"
					className="px-4 py-2 rounded text-sm font-semibold"
					style={{ background: "var(--accent)", color: "#fff" }}
				>
					Go to Library
				</Link>
			</div>
		);
	}

	const handleDelete = () => {
		if (window.confirm(`Delete "${topic.title}"? This cannot be undone.`)) {
			deleteTopic(topic.id);
			navigate("/");
		}
	};

	const sources = topic
		? getDefaultCategorySources(topic.category, topic.title)
		: undefined;

	return (
		<div className="flex-1 overflow-y-auto bg-[var(--bg)] text-[var(--text)]">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
				{/* Header Actions */}
				<div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border)]">
					<button
						type="button"
						onClick={() => window.history.back()}
						className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
					>
						<ArrowLeft className="w-4 h-4" /> Back to Library
					</button>

					<div className="flex items-center gap-2">
						<Link
							to={`/edit/${topic.id}`}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors"
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={handleDelete}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</div>
				</div>

				{/* Title Area */}
				<div className="mb-6">
					<div className="flex flex-wrap gap-2 mb-3">
						<span className="badge badge-accent text-xs px-2.5 py-1">
							{topic.category}
						</span>
						<span
							className={`badge ${topic.source === "web" ? "badge-accent" : "badge-success"} text-xs px-2.5 py-1`}
						>
							{topic.source === "web" ? "AI Synthesized" : "Mains Library"}
						</span>
					</div>
					<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">
						{topic.title}
					</h1>
					<p className="text-xs mt-2 text-[var(--muted)]">
						Saved note · Updated{" "}
						{new Date(topic.updatedAt).toLocaleDateString()}
					</p>
				</div>

				{/* Full Topic Detail */}
				<div className="rounded-2xl shadow-sm border border-[var(--border)] bg-[var(--surface)]">
					<TopicDetail topic={topic} sources={sources} />
				</div>
			</div>
		</div>
	);
}
