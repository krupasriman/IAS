import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import TopicForm from "../components/TopicForm";
import { useTopics } from "../hooks/useTopics";

export default function EditTopicPage() {
	const { id } = useParams<{ id: string }>();
	const { loading, updateTopic, getTopic } = useTopics();

	const topic = id ? getTopic(id) : undefined;

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<Loader2
					className="w-8 h-8 animate-spin"
					style={{ color: "var(--accent)" }}
				/>
			</div>
		);
	}

	if (!topic) {
		return (
			<div className="max-w-2xl mx-auto text-center py-24">
				<AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
				<h2 className="text-2xl font-bold text-slate-900 mb-2">
					Topic not found
				</h2>
				<p className="text-slate-500 mb-8">
					Unable to edit this topic because it doesn't exist.
				</p>
				<Link
					to="/"
					className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
				>
					<ArrowLeft className="w-4 h-4" /> Back to Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
			<div className="max-w-3xl mx-auto px-4 py-6">
				<TopicForm
					initialTopic={topic}
					onSave={(data) => updateTopic(topic.id, data)}
					isEditing
				/>
			</div>
		</div>
	);
}
