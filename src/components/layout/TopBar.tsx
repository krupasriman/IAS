import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";

const ROUTE_LABELS: Record<string, string> = {
	"/": "IAS Study",
	"/topics": "Library",
	"/add": "New Topic",
	"/settings": "Settings",
};

export default function TopBar() {
	const { toggleSidebar } = useWorkspace();
	const location = useLocation();

	const isEdit = location.pathname.startsWith("/edit/");
	const isTopic = location.pathname.startsWith("/topic/");

	const pageLabel = isEdit
		? "Edit Topic"
		: isTopic
			? "Study Note"
			: (ROUTE_LABELS[location.pathname] ?? "");

	return (
		<div className="h-12 border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-3 sm:px-4 justify-between gap-3 select-none flex-shrink-0">
			{/* Left: Sidebar toggle & Page Label */}
			<div className="flex items-center gap-2 min-w-0">
				<button
					type="button"
					onClick={toggleSidebar}
					className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] md:hidden flex-shrink-0"
					aria-label="Toggle sidebar"
				>
					<Menu className="w-4 h-4" />
				</button>

				{pageLabel && (
					<span className="text-xs font-semibold text-[var(--muted)] truncate">
						{pageLabel}
					</span>
				)}
			</div>
		</div>
	);
}
