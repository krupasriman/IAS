import TopicForm from "../components/TopicForm";
import { useTopics } from "../hooks/useTopics";

export default function AddTopicPage() {
	const { addTopic } = useTopics();

	return (
		<div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
			<div className="max-w-3xl mx-auto px-4 py-6">
				<TopicForm onSave={addTopic} />
			</div>
		</div>
	);
}
