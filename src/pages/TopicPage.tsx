import { AlertCircle, ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopicDetail from "../components/TopicDetail";
import { useTopics } from "../hooks/useTopics";

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

	return (
		<div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
			<div className="max-w-6xl mx-auto px-6 py-8">
				{/* Header Actions */}
				<div className="flex items-center justify-between mb-6">
					<button
						type="button"
						onClick={() => window.history.back()}
						className="flex items-center gap-1.5 text-sm transition-colors"
						style={{ color: "var(--muted)" }}
					>
						<ArrowLeft className="w-4 h-4" /> Back
					</button>

					<div className="flex items-center gap-2">
						<Link
							to={`/edit/${topic.id}`}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
							style={{ background: "var(--surface-2)", color: "var(--text)" }}
						>
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Link>
						<button
							type="button"
							onClick={handleDelete}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
							style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
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
							{topic.source === "web" ? "AI Generated" : "Local"}
						</span>
					</div>
					<h1
						className="text-4xl font-extrabold leading-tight tracking-tight"
						style={{ color: "var(--text)" }}
					>
						{topic.title}
					</h1>
					<p
						className="text-sm mt-2 font-medium"
						style={{ color: "var(--muted)" }}
					>
						Updated {new Date(topic.updatedAt).toLocaleDateString()}
					</p>
				</div>

				{/* Full Topic Detail */}
				<div
					className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
					style={{ borderColor: "var(--border)", background: "var(--surface)" }}
				>
					<TopicDetail topic={topic} />
				</div>
			</div>
		</div>
	);
}
