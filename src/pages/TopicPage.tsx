import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopicDetail from "../components/TopicDetail";
import { useTopics } from "../hooks/useTopics";

export default function TopicPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { loading, deleteTopic, getTopic } = useTopics();

	const topic = id ? getTopic(id) : undefined;

	const handleDelete = (deleteId: string) => {
		deleteTopic(deleteId);
		navigate("/");
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
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
					The topic you're looking for doesn't exist or may have been deleted.
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
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<TopicDetail topic={topic} onDelete={handleDelete} />
		</div>
	);
}
