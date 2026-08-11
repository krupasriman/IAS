import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	Building2,
	ChevronLeft,
	ChevronRight,
	Compass,
	Cpu,
	Globe,
	GraduationCap,
	Landmark,
	Leaf,
	Moon,
	Plus,
	Scale,
	Settings,
	Sun,
	TrendingUp,
	Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { CATEGORIES } from "../../data/categories";
import { useTopics } from "../../hooks/useTopics";
import type { CategoryType } from "../../types/topic.types";

const CAT_ICON_MAP: Record<string, LucideIcon> = {
	Polity: Landmark,
	Governance: Building2,
	Economy: TrendingUp,
	Society: Users,
	IR: Globe,
	Ethics: Scale,
	Geography: Compass,
	Environment: Leaf,
	"Science & Tech": Cpu,
	History: BookOpen,
};

const CAT_COLORS: Record<string, string> = {
	Polity: "#3b82f6",
	Governance: "#6366f1",
	Economy: "#10b981",
	Society: "#a855f7",
	IR: "#0ea5e9",
	Ethics: "#f59e0b",
	Geography: "#14b8a6",
	Environment: "#22c55e",
	"Science & Tech": "#06b6d4",
	History: "#f97316",
};

interface SidebarProps {
	collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
	const { toggleSidebar, dark, toggleDark } = useWorkspace();
	const { topics } = useTopics();
	const location = useLocation();

	const recent = topics.slice(0, 8);

	const catCounts: Record<string, number> = {};
	for (const t of topics) {
		catCounts[t.category] = (catCounts[t.category] || 0) + 1;
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Logo + toggle */}
			<div
				className="flex items-center gap-2 px-3 border-b"
				style={{
					height: "var(--topbar-h)",
					minHeight: "var(--topbar-h)",
					borderColor: "var(--border)",
				}}
			>
				<Link
					to="/"
					className="flex items-center gap-2 flex-1 min-w-0"
					title="IAS Study · Mains Workspace"
				>
					<div
						className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
						style={{ background: "var(--accent)" }}
					>
						<GraduationCap className="w-3.5 h-3.5 text-white" />
					</div>
					{!collapsed && (
						<div className="min-w-0">
							<div
								className="text-sm font-semibold leading-tight truncate"
								style={{ color: "var(--text)" }}
							>
								IAS Study
							</div>
							<div
								className="text-[10px] uppercase tracking-widest leading-tight"
								style={{ color: "var(--muted)" }}
							>
								Mains 2026
							</div>
						</div>
					)}
				</Link>

				<button
					type="button"
					onClick={toggleSidebar}
					className="flex-shrink-0 p-1 rounded hover:bg-[var(--surface-2)] transition-colors"
					style={{ color: "var(--faint)" }}
					title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘[)`}
				>
					{collapsed ? (
						<ChevronRight className="w-3.5 h-3.5" />
					) : (
						<ChevronLeft className="w-3.5 h-3.5" />
					)}
				</button>
			</div>

			{/* New topic */}
			<div
				className="px-2 py-2"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<Link
					to="/add"
					className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-sm font-medium transition-colors"
					style={{
						background: "var(--accent-2)",
						color: "var(--accent)",
					}}
					title="New Topic (⌘N)"
				>
					<Plus className="w-4 h-4 flex-shrink-0" />
					{!collapsed && <span>New Topic</span>}
				</Link>
			</div>

			{/* Scrollable nav body */}
			<div className="flex-1 overflow-y-auto py-1">
				{/* Categories */}
				{!collapsed && (
					<div
						className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
						style={{ color: "var(--faint)" }}
					>
						Categories
					</div>
				)}

				<div className="px-2 space-y-0.5">
					<Link
						to="/"
						className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
						title="All Topics"
					>
						<BookOpen className="w-4 h-4 flex-shrink-0" />
						{!collapsed && (
							<>
								<span className="flex-1 truncate">All Topics</span>
								<span
									className="text-xs ml-auto flex-shrink-0"
									style={{ color: "var(--faint)" }}
								>
									{topics.length}
								</span>
							</>
						)}
					</Link>

					{CATEGORIES.map((cat) => {
						const Icon = CAT_ICON_MAP[cat.id] ?? BookOpen;
						const color = CAT_COLORS[cat.id] ?? "var(--accent)";
						const count = catCounts[cat.id as CategoryType] ?? 0;
						if (count === 0 && !collapsed) return null;
						return (
							<Link
								key={cat.id}
								to={`/?cat=${encodeURIComponent(cat.id)}`}
								className="nav-item"
								title={cat.name}
							>
								<Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
								{!collapsed && (
									<>
										<span className="flex-1 truncate">{cat.name}</span>
										{count > 0 && (
											<span
												className="text-xs ml-auto flex-shrink-0"
												style={{ color: "var(--faint)" }}
											>
												{count}
											</span>
										)}
									</>
								)}
							</Link>
						);
					})}
				</div>

				{/* Recent topics */}
				{!collapsed && recent.length > 0 && (
					<>
						<div
							className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest"
							style={{ color: "var(--faint)" }}
						>
							Recent
						</div>
						<div className="px-2 space-y-0.5">
							{recent.map((t) => (
								<Link
									to={`/topic/${t.id}`}
									key={t.id}
									className="nav-item w-full text-left"
									title={t.title}
								>
									<span
										className="w-1.5 h-1.5 rounded-full flex-shrink-0"
										style={{
											background: CAT_COLORS[t.category] ?? "var(--accent)",
										}}
									/>
									<span className="truncate">{t.title}</span>
								</Link>
							))}
						</div>
					</>
				)}
			</div>

			{/* Bottom bar */}
			<div
				className="px-2 py-2 flex items-center gap-1"
				style={{ borderTop: "1px solid var(--border)" }}
			>
				<button
					type="button"
					onClick={toggleDark}
					className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
					style={{ color: "var(--muted)" }}
					title={dark ? "Light mode" : "Dark mode"}
				>
					{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
				</button>
				{!collapsed && (
					<Link to="/settings" className="nav-item flex-1" title="Settings">
						<Settings className="w-4 h-4 flex-shrink-0" />
						<span>Settings</span>
					</Link>
				)}
				{collapsed && (
					<Link
						to="/settings"
						className="p-2 rounded hover:bg-[var(--surface-2)] transition-colors"
						style={{ color: "var(--muted)" }}
						title="Settings"
					>
						<Settings className="w-4 h-4" />
					</Link>
				)}
			</div>
		</div>
	);
}
