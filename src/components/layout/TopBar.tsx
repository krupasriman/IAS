import { ChevronRight, Menu, Moon, Settings, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";

const ROUTE_LABELS: Record<string, string> = {
	"/": "Library",
	"/topics": "All Topics",
	"/add": "New Topic",
	"/settings": "Settings",
};

export default function TopBar() {
	const { toggleSidebar, dark, toggleDark } = useWorkspace();
	const location = useLocation();

	const isEdit = location.pathname.startsWith("/edit/");
	const isTopic = location.pathname.startsWith("/topic/");

	const pageLabel = isEdit
		? "Edit Topic"
		: isTopic
			? "Topic"
			: (ROUTE_LABELS[location.pathname] ?? "Library");

	return (
		<div className="ws-topbar">
			{/* Hamburger (always visible on mobile) */}
			<button
				type="button"
				onClick={toggleSidebar}
				className="flex-shrink-0 p-1.5 rounded hover:bg-[var(--surface-2)] transition-colors"
				style={{ color: "var(--muted)" }}
				aria-label="Toggle sidebar"
			>
				<Menu className="w-4 h-4" />
			</button>

			{/* Breadcrumbs */}
			<nav
				className="flex items-center gap-1 text-sm min-w-0 flex-1"
				aria-label="Breadcrumb"
			>
				<Link
					to="/"
					className="hover:text-[var(--text)] transition-colors truncate"
					style={{ color: "var(--muted)", fontSize: "0.8125rem" }}
				>
					IAS Study
				</Link>
				<ChevronRight
					className="w-3.5 h-3.5 flex-shrink-0"
					style={{ color: "var(--faint)" }}
				/>
				<span
					className="font-medium truncate"
					style={{ color: "var(--text)", fontSize: "0.8125rem" }}
				>
					{pageLabel}
				</span>
			</nav>

			{/* Right actions */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<button
					type="button"
					onClick={toggleDark}
					className="p-1.5 rounded hover:bg-[var(--surface-2)] transition-colors"
					style={{ color: "var(--muted)" }}
					title={dark ? "Light mode" : "Dark mode"}
				>
					{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
				</button>

				<Link
					to="/settings"
					className="p-1.5 rounded hover:bg-[var(--surface-2)] transition-colors"
					style={{ color: "var(--muted)" }}
					title="Settings"
				>
					<Settings className="w-4 h-4" />
				</Link>
			</div>
		</div>
	);
}
