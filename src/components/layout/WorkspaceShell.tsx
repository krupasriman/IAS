import { PanelLeft } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import SettingsModal from "../SettingsModal";
import Sidebar from "./Sidebar";

export default function WorkspaceShell({
	children,
}: {
	children: React.ReactNode;
}) {
	const {
		sidebarOpen,
		setSidebarOpen,
		toggleSidebar,
		startNewTopic,
		isSettingsOpen,
		closeSettings,
	} = useWorkspace();
	const navigate = useNavigate();
	const [isTablet, setIsTablet] = useState(false);
	const hasMounted = useRef(false);

	useEffect(() => {
		const check = () => {
			setIsTablet(window.innerWidth < 1024);
		};
		check();
		if (!hasMounted.current) {
			hasMounted.current = true;
			if (window.innerWidth < 1024) setSidebarOpen(false);
		}
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, [setSidebarOpen]);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "[" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggleSidebar();
			}
			if ((e.key === "n" || e.key === "N") && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				startNewTopic();
				navigate("/");
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [toggleSidebar, startNewTopic, navigate]);

	const sidebarClass = [
		"ws-sidebar",
		isTablet
			? sidebarOpen
				? "mobile-open"
				: ""
			: sidebarOpen
				? ""
				: "collapsed",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="ws-shell">
			{/* Sidebar overlay on tablet/mobile */}
			{isTablet && sidebarOpen && (
				<div
					className="mobile-overlay"
					onClick={() => setSidebarOpen(false)}
					aria-hidden="true"
				/>
			)}

			<div className={sidebarClass}>
				<Sidebar collapsed={!sidebarOpen} />
			</div>

			<div className="ws-main relative">
				{/* Floating open-sidebar toggle button when sidebar is closed */}
				{!sidebarOpen && (
					<button
						type="button"
						onClick={toggleSidebar}
						className="fixed top-3.5 left-3.5 z-40 p-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
						title="Open sidebar"
						aria-label="Open sidebar"
					>
						<PanelLeft className="w-4 h-4" />
					</button>
				)}
				{children}
			</div>

			{/* ChatGPT-style Settings Modal */}
			<SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
		</div>
	);
}
