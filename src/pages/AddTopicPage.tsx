import TopicForm from "../components/TopicForm";
import { useTopics } from "../hooks/useTopics";

export default function AddTopicPage() {
	const { addTopic } = useTopics();

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<TopicForm onSave={addTopic} />
		</div>
	);
}
