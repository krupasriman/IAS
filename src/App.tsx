import { BrowserRouter, Route, Routes } from "react-router-dom";
import WorkspaceShell from "./components/layout/WorkspaceShell";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import AddTopicPage from "./pages/AddTopicPage";
import AllTopicsPage from "./pages/AllTopicsPage";
import EditTopicPage from "./pages/EditTopicPage";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import TopicPage from "./pages/TopicPage";

export default function App() {
	return (
		<WorkspaceProvider>
			<BrowserRouter>
				<WorkspaceShell>
					<Routes>
						<Route path="/" element={<HomePage />} />
						<Route path="/topics" element={<AllTopicsPage />} />
						<Route path="/topic/:id" element={<TopicPage />} />
						<Route path="/add" element={<AddTopicPage />} />
						<Route path="/edit/:id" element={<EditTopicPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="*" element={<HomePage />} />
					</Routes>
				</WorkspaceShell>
			</BrowserRouter>
		</WorkspaceProvider>
	);
}
