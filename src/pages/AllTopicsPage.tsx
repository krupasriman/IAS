import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import TopicRow from "../components/TopicRow";
import { CATEGORIES } from "../data/categories";
import { useTopics } from "../hooks/useTopics";
import type { CategoryType } from "../types/topic.types";

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

export default function AllTopicsPage() {
	const { topics, loading } = useTopics();
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState<"All" | CategoryType>("All");

	const filtered = useMemo(() => {
		let result = topics;
		if (category !== "All")
			result = result.filter((t) => t.category === category);
		if (query.trim()) {
			const q = query.trim().toLowerCase();
			result = result.filter(
				(t) =>
					t.title.toLowerCase().includes(q) ||
					t.meaning.toLowerCase().includes(q),
			);
		}
		return result;
	}, [topics, category, query]);

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Search bar */}
			<div
				className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
				style={{
					borderBottom: "1px solid var(--border)",
					background: "var(--surface)",
				}}
			>
				<Search
					className="w-4 h-4 flex-shrink-0"
					style={{ color: "var(--muted)" }}
				/>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Filter topics…"
					className="flex-1 bg-transparent outline-none text-sm"
					style={{ color: "var(--text)" }}
				/>
			</div>

			{/* Category strip */}
			<div
				className="flex items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
				style={{
					borderBottom: "1px solid var(--border)",
					background: "var(--surface)",
				}}
			>
				<button
					type="button"
					onClick={() => setCategory("All")}
					className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold transition-colors"
					style={{
						background: category === "All" ? "var(--text)" : "transparent",
						color: category === "All" ? "var(--surface)" : "var(--muted)",
					}}
				>
					All ({topics.length})
				</button>
				{CATEGORIES.map((cat) => {
					const color = CAT_COLORS[cat.id] ?? "var(--accent)";
					const isActive = category === cat.id;
					const count = topics.filter((t) => t.category === cat.id).length;
					if (count === 0) return null;
					return (
						<button
							type="button"
							key={cat.id}
							onClick={() => setCategory(cat.id)}
							className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors"
							style={{
								background: isActive ? `${color}18` : "transparent",
								color: isActive ? color : "var(--muted)",
							}}
						>
							<span
								className="w-1.5 h-1.5 rounded-full"
								style={{ background: color }}
							/>
							{cat.name.split(" ")[0]} ({count})
						</button>
					);
				})}
			</div>

			{/* List header */}
			<div
				className="flex items-center justify-between px-4 py-2 flex-shrink-0"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<span
					className="text-xs font-semibold uppercase tracking-widest"
					style={{ color: "var(--faint)" }}
				>
					{category === "All" ? "All Topics" : category} — {filtered.length}
				</span>
				<div
					className="hidden md:flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wide"
					style={{ color: "var(--faint)" }}
				>
					<span className="hidden lg:block w-16 text-right">Date</span>
				</div>
			</div>

			{/* Topic rows */}
			<div className="flex-1 overflow-y-auto min-h-0">
				{loading ? (
					<div className="flex items-center justify-center py-16">
						<Loader2
							className="w-6 h-6 animate-spin"
							style={{ color: "var(--accent)" }}
						/>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Search
							className="w-10 h-10 mb-3"
							style={{ color: "var(--surface-3)" }}
						/>
						<p className="text-sm" style={{ color: "var(--muted)" }}>
							No topics found
						</p>
					</div>
				) : (
					filtered.map((topic) => <TopicRow key={topic.id} topic={topic} />)
				)}
			</div>
		</div>
	);
}
