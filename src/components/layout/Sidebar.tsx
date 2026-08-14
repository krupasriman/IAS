import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	BookOpen,
	Building2,
	ChevronDown,
	ChevronRight,
	Compass,
	Cpu,
	Globe,
	GraduationCap,
	Landmark,
	Leaf,
	Moon,
	PanelLeft,
	Scale,
	Settings,
	ShieldAlert,
	SquarePen,
	Sun,
	TrendingUp,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
	"Internal Security": ShieldAlert,
	Sociology: GraduationCap,
	"Disaster Management": AlertTriangle,
};

interface SidebarProps {
	collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
	const { toggleSidebar, dark, toggleDark, startNewTopic, openSettings } =
		useWorkspace();
	const { topics } = useTopics();
	const location = useLocation();
	const navigate = useNavigate();
	const [categoriesOpen, setCategoriesOpen] = useState(false);

	const handleNewTopic = () => {
		startNewTopic();
		navigate("/");
	};

	const recent = topics.slice(0, 10);

	const catCounts: Record<string, number> = {};
	for (const t of topics) {
		catCounts[t.category] = (catCounts[t.category] || 0) + 1;
	}

	return (
		<div className="flex flex-col h-full overflow-hidden select-none bg-[var(--surface-sidebar)] text-[var(--text)]">
			{/* Top Header (ChatGPT Logo + Sidebar Toggle + New Chat) */}
			<div className="flex items-center justify-between px-3 py-3 h-14 border-b border-[var(--border)]">
				<Link
					to="/"
					className="flex items-center gap-2.5 min-w-0 group"
					title="IAS Study Assistant"
				>
					<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--text)] text-[var(--bg)] shadow-sm group-hover:scale-105 transition-transform">
						<GraduationCap className="w-4 h-4" />
					</div>
					{!collapsed && (
						<div className="min-w-0">
							<span className="text-sm font-bold tracking-tight block truncate">
								IAS Study
							</span>
							<span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted)] block leading-none">
								Mains Assistant
							</span>
						</div>
					)}
				</Link>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={toggleSidebar}
						className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)]"
						title={`${collapsed ? "Open" : "Close"} sidebar`}
					>
						<PanelLeft className="w-4 h-4" />
					</button>
					{!collapsed && (
						<button
							type="button"
							onClick={handleNewTopic}
							className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)]"
							title="New Topic"
						>
							<SquarePen className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Main Navigation Actions */}
			<div className="px-2 pt-3 pb-1 space-y-1">
				<button
					type="button"
					onClick={handleNewTopic}
					className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors text-left group"
					title="New Topic"
				>
					<SquarePen className="w-4 h-4 flex-shrink-0 text-[var(--muted)] group-hover:text-[var(--text)]" />
					{!collapsed && <span className="flex-1 truncate">New Topic</span>}
				</button>

				{/* Categories Toggle */}
				{!collapsed && (
					<div>
						<button
							type="button"
							onClick={() => setCategoriesOpen(!categoriesOpen)}
							className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] text-left"
						>
							<Compass className="w-4 h-4 flex-shrink-0" />
							<span className="flex-1 truncate">Categories</span>
							{categoriesOpen ? (
								<ChevronDown className="w-3.5 h-3.5" />
							) : (
								<ChevronRight className="w-3.5 h-3.5" />
							)}
						</button>

						{/* Categories Submenu */}
						{categoriesOpen && (
							<div className="pl-6 pr-1 py-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
								{CATEGORIES.map((cat) => {
									const Icon = CAT_ICON_MAP[cat.id] ?? BookOpen;
									const count = catCounts[cat.id as CategoryType] ?? 0;
									const isCurrent = location.search.includes(
										encodeURIComponent(cat.id),
									);
									return (
										<Link
											key={cat.id}
											to={`/?cat=${encodeURIComponent(cat.id)}`}
											className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
												isCurrent
													? "bg-[var(--surface-3)] text-[var(--text)] font-semibold"
													: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
											}`}
											title={cat.name}
										>
											<Icon className="w-3.5 h-3.5 flex-shrink-0" />
											<span className="flex-1 truncate">{cat.name}</span>
											{count > 0 && (
												<span className="text-[10px] opacity-70">{count}</span>
											)}
										</Link>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Recents Section */}
			<div className="flex-1 overflow-y-auto px-2 py-2">
				{!collapsed && recent.length > 0 && (
					<div>
						<div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-[var(--muted)] tracking-wide">
							Recent Topics
						</div>
						<div className="space-y-0.5">
							{recent.map((t) => {
								const isCurrent = location.pathname === `/topic/${t.id}`;
								return (
									<Link
										to={`/topic/${t.id}`}
										key={t.id}
										className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors group ${
											isCurrent
												? "bg-[var(--surface-2)] text-[var(--text)] font-medium"
												: "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
										}`}
										title={t.title}
									>
										<span className="truncate flex-1">{t.title}</span>
									</Link>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Dark Mode & Settings Footer */}
			<div className="p-2 border-t border-[var(--border)]">
				<div className="flex items-center justify-between gap-1 p-1">
					<button
						type="button"
						onClick={toggleDark}
						className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] flex-1 text-left"
						title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
					>
						{dark ? (
							<Sun className="w-4 h-4 text-amber-400" />
						) : (
							<Moon className="w-4 h-4" />
						)}
						{!collapsed && <span>{dark ? "Light Theme" : "Dark Theme"}</span>}
					</button>

					<button
						type="button"
						onClick={openSettings}
						className="p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
						title="Open Settings"
					>
						<Settings className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
