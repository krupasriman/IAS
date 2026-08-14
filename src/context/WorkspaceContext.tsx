import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

interface WorkspaceCtx {
	sidebarOpen: boolean;
	setSidebarOpen: (v: boolean) => void;
	toggleSidebar: () => void;
	dark: boolean;
	toggleDark: () => void;
	newTopicCounter: number;
	startNewTopic: () => void;
	isSettingsOpen: boolean;
	openSettings: () => void;
	closeSettings: () => void;
}

const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(() => {
		try {
			return localStorage.getItem("ias_sidebar") !== "closed";
		} catch {
			return true;
		}
	});

	const [dark, setDark] = useState(() => {
		try {
			return localStorage.getItem("ias_dark") === "true";
		} catch {
			return false;
		}
	});

	const [newTopicCounter, setNewTopicCounter] = useState(0);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		try {
			localStorage.setItem("ias_dark", String(dark));
		} catch {}
	}, [dark]);

	useEffect(() => {
		try {
			localStorage.setItem("ias_sidebar", sidebarOpen ? "open" : "closed");
		} catch {}
	}, [sidebarOpen]);

	const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
	const toggleDark = useCallback(() => setDark((v) => !v), []);
	const startNewTopic = useCallback(() => setNewTopicCounter((c) => c + 1), []);
	const openSettings = useCallback(() => setIsSettingsOpen(true), []);
	const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

	return (
		<WorkspaceContext.Provider
			value={{
				sidebarOpen,
				setSidebarOpen,
				toggleSidebar,
				dark,
				toggleDark,
				newTopicCounter,
				startNewTopic,
				isSettingsOpen,
				openSettings,
				closeSettings,
			}}
		>
			{children}
		</WorkspaceContext.Provider>
	);
}

// biome-ignore lint/style/useComponentExportOnlyModules: context hook
export function useWorkspace(): WorkspaceCtx {
	const ctx = useContext(WorkspaceContext);
	if (!ctx)
		throw new Error("useWorkspace must be used inside WorkspaceProvider");
	return ctx;
}
