import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Globe,
	Loader2,
	RotateCcw,
	Save,
	Search,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QueryBar from "../components/QueryBar";
import TopicDetail from "../components/TopicDetail";
import TopicRow from "../components/TopicRow";
import { CATEGORIES } from "../data/categories";
import { useTopics } from "../hooks/useTopics";
import { useWebSearch } from "../hooks/useWebSearch";
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

export default function HomePage() {
	const { topics, loading, addTopic } = useTopics();
	const location = useLocation();
	const navigate = useNavigate();

	// Read category from URL ?cat=...
	const searchParams = new URLSearchParams(location.search);
	const urlCat = searchParams.get("cat") as CategoryType | null;

	const [query, setQuery] = useState(() => {
		try {
			const raw = localStorage.getItem("ias_web_search_state");
			return raw ? JSON.parse(raw).query || "" : "";
		} catch {
			return "";
		}
	});
	const [activeCategory, setActiveCategory] = useState<"All" | CategoryType>(
		urlCat ?? "All",
	);
	const [webEnabled, setWebEnabled] = useState(() => {
		try {
			const saved = localStorage.getItem("ias_web_search_enabled");
			return saved !== null ? saved === "true" : true;
		} catch {
			return true;
		}
	});
	const [savedFromWeb, setSavedFromWeb] = useState(false);

	// Sync URL category param
	useEffect(() => {
		if (urlCat) setActiveCategory(urlCat);
		else setActiveCategory("All");
	}, [urlCat]);

	const handleToggleWeb = (v: boolean) => {
		setWebEnabled(v);
		try {
			localStorage.setItem("ias_web_search_enabled", String(v));
		} catch {}
	};

	const webSearch = useWebSearch({ onSuccess: () => {} });

	const handleSearch = (q: string, web: boolean) => {
		setQuery(q);
		if (web)
			webSearch.process(
				q,
				activeCategory !== "All" ? activeCategory : undefined,
			);
		else
			webSearch.processLLMOnly(
				q,
				activeCategory !== "All" ? activeCategory : undefined,
			);
	};

	const handleSave = () => {
		if (webSearch.generatedTopic) {
			const topicId = webSearch.generatedTopic.id;
			addTopic(webSearch.generatedTopic);
			setSavedFromWeb(true);
			setTimeout(() => {
				setSavedFromWeb(false);
				webSearch.reset();
				handleToggleWeb(false);
				setQuery("");
				navigate(`/topic/${topicId}`);
			}, 1000);
		}
	};

	// Filter topics
	const filtered = topics.filter((t) => {
		if (activeCategory !== "All" && t.category !== activeCategory) return false;
		if (query.trim()) {
			const q = query.toLowerCase();
			return (
				t.title.toLowerCase().includes(q) ||
				t.meaning.toLowerCase().includes(q) ||
				(t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
			);
		}
		return true;
	});

	const isGenerating =
		webSearch.progress.stage === "searching_web" ||
		webSearch.progress.stage === "processing_llm" ||
		webSearch.progress.stage === "validating";

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* ── Query Bar ── */}
			<QueryBar
				value={query}
				onChange={setQuery}
				onSearch={handleSearch}
				webEnabled={webEnabled}
				onToggleWeb={handleToggleWeb}
				loading={isGenerating}
				stage={webSearch.progress.message}
				progress={webSearch.progress.progressPercentage}
				history={webSearch.history}
				onLoadHistory={webSearch.loadFromHistory}
				onRemoveHistory={webSearch.removeFromHistory}
			/>

			{/* ── Category filter strip ── */}
			<div
				className="flex items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
				style={{
					background: "var(--surface)",
					borderBottom: "1px solid var(--border)",
				}}
			>
				<button
					type="button"
					onClick={() => setActiveCategory("All")}
					className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold transition-colors"
					style={{
						background:
							activeCategory === "All" ? "var(--text)" : "transparent",
						color: activeCategory === "All" ? "var(--surface)" : "var(--muted)",
					}}
				>
					All ({topics.length})
				</button>
				{CATEGORIES.map((cat) => {
					const color = CAT_COLORS[cat.id] ?? "var(--accent)";
					const isActive = activeCategory === cat.id;
					const count = topics.filter((t) => t.category === cat.id).length;
					if (count === 0) return null;
					return (
						<button
							type="button"
							key={cat.id}
							onClick={() => setActiveCategory(cat.id)}
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

			{/* ── Main scroll area ── */}
			<div className="flex-1 overflow-y-auto min-h-0">
				{/* Error */}
				{webSearch.error && (
					<div
						className="mx-3 mt-3 flex items-start gap-2 p-3 rounded-lg text-sm"
						style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
					>
						<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
						<div>
							<p className="font-semibold">Generation failed</p>
							<p className="text-xs mt-0.5 opacity-80">{webSearch.error}</p>
						</div>
					</div>
				)}

				{/* ── AI Generated result ── */}
				{webSearch.generatedTopic && (
					<div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
						{/* Header Actions */}
						<div className="flex items-center justify-between mb-6">
							<div className="flex flex-wrap gap-2">
								<span className="badge badge-accent">
									<Sparkles className="w-3.5 h-3.5 mr-1" />
									AI Generated
								</span>
								<span
									className="text-sm font-medium flex items-center"
									style={{ color: "var(--muted)" }}
								>
									{webSearch.searchResults
										? `${webSearch.searchResults.results.length} sources`
										: "LLM only"}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => {
										webSearch.reset();
										handleToggleWeb(false);
										setQuery("");
									}}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
									style={{
										background: "var(--surface-2)",
										color: "var(--text)",
									}}
								>
									<RotateCcw className="w-3.5 h-3.5" />
									Clear
								</button>
								<button
									type="button"
									onClick={handleSave}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
									style={{
										background: savedFromWeb
											? "var(--success-bg)"
											: "var(--accent)",
										color: savedFromWeb ? "var(--success)" : "#fff",
									}}
								>
									{savedFromWeb ? (
										<CheckCircle2 className="w-3.5 h-3.5" />
									) : (
										<Save className="w-3.5 h-3.5" />
									)}
									{savedFromWeb ? "Saved!" : "Save"}
								</button>
							</div>
						</div>

						{/* Title Area */}
						<div className="mb-6">
							<div className="flex flex-wrap gap-2 mb-3">
								<span className="badge badge-accent">
									{webSearch.generatedTopic.category}
								</span>
							</div>
							<h1
								className="text-4xl font-extrabold leading-tight tracking-tight"
								style={{ color: "var(--text)" }}
							>
								{webSearch.generatedTopic.title}
							</h1>
						</div>

						{/* Full Topic Detail */}
						<div
							className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8"
							style={{
								borderColor: "var(--border)",
								background: "var(--surface)",
							}}
						>
							<TopicDetail topic={webSearch.generatedTopic} />
						</div>

						{/* Sources */}
						{webSearch.searchResults &&
							webSearch.searchResults.results.length > 0 && (
								<div
									className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
									style={{
										borderColor: "var(--border)",
										background: "var(--surface)",
									}}
								>
									<div
										className="px-4 py-3 border-b flex items-center gap-2"
										style={{
											borderColor: "var(--border)",
											background: "var(--surface-2)",
										}}
									>
										<Globe
											className="w-4 h-4 flex-shrink-0"
											style={{ color: "var(--muted)" }}
										/>
										<span
											className="text-sm font-semibold uppercase tracking-wider"
											style={{ color: "var(--muted)" }}
										>
											Sources
										</span>
									</div>
									<div
										className="divide-y"
										style={{ borderColor: "var(--border)" }}
									>
										{webSearch.searchResults.results.slice(0, 6).map((r, i) => (
											<a
												// biome-ignore lint/suspicious/noArrayIndexKey: stable enough for links
												key={i}
												href={r.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group"
												style={{ background: "var(--surface)" }}
											>
												<div className="flex-1 min-w-0">
													<p
														className="font-semibold text-sm truncate mb-0.5 group-hover:text-[var(--accent)] transition-colors"
														style={{ color: "var(--text)" }}
													>
														{r.title}
													</p>
													<p
														className="text-xs line-clamp-2"
														style={{ color: "var(--muted)" }}
													>
														{r.snippet}
													</p>
													<p
														className="text-[10px] mt-1.5 truncate"
														style={{ color: "var(--faint)" }}
													>
														{r.source || new URL(r.url).hostname}
													</p>
												</div>
												<ExternalLink
													className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity"
													style={{ color: "var(--muted)" }}
												/>
											</a>
										))}
									</div>
								</div>
							)}
					</div>
				)}

				{/* ── Topic List ── */}
				{!webSearch.generatedTopic && (
					<>
						{/* List header */}
						<div
							className="flex items-center justify-between px-4 py-2"
							style={{ borderBottom: "1px solid var(--border)" }}
						>
							<span
								className="text-xs font-semibold uppercase tracking-widest"
								style={{ color: "var(--faint)" }}
							>
								{activeCategory === "All" ? `All Topics` : activeCategory} —{" "}
								{filtered.length}
							</span>
							{/* Column labels */}
							<div
								className="hidden md:flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wide"
								style={{ color: "var(--faint)" }}
							>
								<span className="w-8 text-right">Score</span>
								<span className="hidden lg:block w-16 text-right">Date</span>
							</div>
						</div>

						{/* Topics */}
						{loading ? (
							<div className="flex items-center justify-center py-16">
								<Loader2
									className="w-6 h-6 animate-spin"
									style={{ color: "var(--accent)" }}
								/>
							</div>
						) : filtered.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
								<Search
									className="w-10 h-10 mb-3"
									style={{ color: "var(--surface-3)" }}
								/>
								<p
									className="text-sm font-medium"
									style={{ color: "var(--text-2)" }}
								>
									{query
										? `No results for "${query}"`
										: activeCategory !== "All"
											? `No topics in ${activeCategory}`
											: "No topics yet"}
								</p>
								<p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
									Type a topic above and press Generate to create one
								</p>
							</div>
						) : (
							<div>
								{filtered.map((topic) => (
									<TopicRow key={topic.id} topic={topic} />
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
