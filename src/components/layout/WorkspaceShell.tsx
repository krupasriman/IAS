import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import Sidebar from "./Sidebar";

export default function WorkspaceShell({
	children,
}: {
	children: React.ReactNode;
}) {
	const { sidebarOpen, setSidebarOpen, toggleSidebar } = useWorkspace();
	const [_isMobile, setIsMobile] = useState(false);
	const [isTablet, setIsTablet] = useState(false);
	const hasMounted = useRef(false);

	useEffect(() => {
		const check = () => {
			setIsMobile(window.innerWidth < 768);
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
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [toggleSidebar]);

	const sidebarClass = [
		"ws-sidebar",
		isTablet ? (sidebarOpen ? "mobile-open" : "") : sidebarOpen ? "" : "rail",
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
				<Sidebar collapsed={!isTablet && !sidebarOpen} />
			</div>

			<div className="ws-main">{children}</div>
		</div>
	);
}
