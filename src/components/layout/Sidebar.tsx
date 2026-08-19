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
	History,
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
	X,
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
	const {
		toggleSidebar,
		dark,
		toggleDark,
		startNewTopic,
		openSettings,
		searchHistory,
		loadSearchHistoryItem,
		removeFromSearchHistory,
		triggerCategorySelect,
	} = useWorkspace();
	const { topics } = useTopics();
	const location = useLocation();
	const navigate = useNavigate();
	const [categoriesOpen, setCategoriesOpen] = useState(false);

	const handleNewTopic = () => {
		startNewTopic();
		navigate("/");
	};

	const catCounts: Record<string, number> = {};
	for (const t of topics) {
		catCounts[t.category] = (catCounts[t.category] || 0) + 1;
	}

	return (
		<div className="flex flex-col h-full overflow-hidden select-none bg-[var(--surface-sidebar)] text-[var(--text)]">
			{/* Top Header (ChatGPT Logo + Sidebar Toggle + New Chat) */}
			<div className="flex items-center justify-between px-3.5 py-3 h-14 border-b border-[var(--border)] flex-shrink-0">
				<Link
					to="/"
					className="flex items-center gap-2.5 min-w-0 group"
					title="IAS Study Assistant"
				>
					<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--text)] text-[var(--bg)] shadow-sm group-hover:scale-105 transition-transform">
						<GraduationCap className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<span className="text-sm font-bold tracking-tight block truncate">
							IAS Study
						</span>
						<span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted)] block leading-none">
							Mains Assistant
						</span>
					</div>
				</Link>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={toggleSidebar}
						className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
						title="Close sidebar"
					>
						<PanelLeft className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={handleNewTopic}
						className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
						title="New Topic"
					>
						<SquarePen className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Main Navigation Actions */}
			<div className="px-2 pt-3 pb-1 space-y-1 flex-shrink-0">
				<button
					type="button"
					onClick={handleNewTopic}
					className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors text-left group cursor-pointer"
					title="New Topic"
				>
					<SquarePen className="w-4 h-4 flex-shrink-0 text-[var(--muted)] group-hover:text-[var(--text)]" />
					<span className="flex-1 truncate">New Topic</span>
				</button>

				{/* Categories Toggle */}
				<div>
					<button
						type="button"
						onClick={() => setCategoriesOpen(!categoriesOpen)}
						className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-2)] transition-colors text-[var(--muted)] hover:text-[var(--text)] text-left cursor-pointer"
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
										onClick={triggerCategorySelect}
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
			</div>

			{/* Recents Section */}
			<div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
				{/* Recent Searches (Web / Generated) */}
				{!collapsed && searchHistory.length > 0 && (
					<div>
						<div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-[var(--muted)] tracking-wide flex items-center justify-between">
							<span>Recent Searches</span>
						</div>
						<div className="space-y-0.5">
							{searchHistory.map((item, idx) => (
								<div
									key={item.id ? `${item.id}-${idx}` : `hist-${idx}`}
									className="flex items-center justify-between px-3 py-1.5 rounded-xl text-sm transition-colors group hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text)]"
								>
									<button
										type="button"
										className="flex items-center gap-2.5 min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer text-[var(--text-2)] hover:text-[var(--text)]"
										onClick={() => {
											loadSearchHistoryItem(item);
											navigate("/");
										}}
									>
										<History className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
										<span className="truncate text-xs font-medium">
											{item.query}
										</span>
									</button>
									<button
										type="button"
										onClick={() => removeFromSearchHistory(item.id)}
										className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer flex-shrink-0"
										title="Remove search"
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
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
						onClick={() => openSettings()}
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
