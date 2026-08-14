import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	Globe,
	Loader2,
	RotateCcw,
	Save,
	Search,
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QueryBar from "../components/QueryBar";
import TopicDetail from "../components/TopicDetail";
import TopicRow from "../components/TopicRow";
import { useWorkspace } from "../context/WorkspaceContext";
import { useTopics } from "../hooks/useTopics";
import { useWebSearch } from "../hooks/useWebSearch";
import type { CategoryType } from "../types/topic.types";

const SUGGESTIONS: {
	title: string;
	desc: string;
	icon: string;
	category?: CategoryType;
}[] = [
	{
		title: "One Nation One Election",
		desc: "Constitutional & federalism framework",
		icon: "⚖️",
		category: "Polity",
	},
	{
		title: "Ethics in Public Administration",
		desc: "2nd ARC 4th report recommendations",
		icon: "🏛️",
		category: "Ethics",
	},
	{
		title: "Semiconductor Mission & IndiaAI",
		desc: "Tech sovereignty & global supply chains",
		icon: "⚡",
		category: "Science & Tech",
	},
	{
		title: "Uniform Civil Code (UCC)",
		desc: "Article 44 & social cohesion analysis",
		icon: "📜",
		category: "Polity",
	},
];

export default function HomePage() {
	const { topics, loading, addTopic } = useTopics();
	const { newTopicCounter } = useWorkspace();
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
	const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
	const lastHandledNewTopic = useRef(0);

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

	// Handle "+ New Topic" action
	useEffect(() => {
		if (newTopicCounter > lastHandledNewTopic.current) {
			lastHandledNewTopic.current = newTopicCounter;

			if (webSearch.generatedTopic) {
				webSearch.addToHistory(
					query || webSearch.generatedTopic.title,
					webSearch.generatedTopic,
					webSearch.searchResults,
				);
			}

			webSearch.reset();
			setQuery("");
			setSavedFromWeb(false);
			setSearchFocusTrigger((c) => c + 1);
		}
	}, [newTopicCounter, webSearch, query]);

	const handleSearch = (q: string, web: boolean) => {
		setQuery("");
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
			}, 800);
		}
	};

	const isGenerating =
		webSearch.progress.stage === "searching_web" ||
		webSearch.progress.stage === "processing_llm" ||
		webSearch.progress.stage === "validating";

	const categoryTopics =
		activeCategory !== "All"
			? topics.filter((t) => t.category === activeCategory)
			: [];

	const isCategoryView = !webSearch.generatedTopic && activeCategory !== "All";

	return (
		<div className="flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
			{/* ── Main Canvas Scroll Area ── */}
			<div className="flex-1 overflow-y-auto min-h-0">
				{/* Error Notification */}
				{webSearch.error && (
					<div className="max-w-4xl mx-auto px-4 mt-4">
						<div
							className="flex items-start gap-2.5 p-3.5 rounded-2xl text-sm border border-red-200 dark:border-red-900/40"
							style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
						>
							<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-semibold text-xs uppercase tracking-wide">
									Generation failed
								</p>
								<p className="text-xs mt-0.5 opacity-90">{webSearch.error}</p>
							</div>
						</div>
					</div>
				)}

				{/* ── STATE 1: AI Generated Topic (Canvas / Document Reader) ── */}
				{webSearch.generatedTopic && (
					<div className="w-full px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
						{/* Document Top Bar */}
						<div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
							<div className="flex flex-wrap gap-2 items-center">
								<span className="badge badge-accent">
									<Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-500" />
									Mains Study Note
								</span>
								<span className="text-xs font-medium text-[var(--muted)]">
									{webSearch.searchResults &&
									webSearch.searchResults.results.length > 0
										? `${webSearch.searchResults.results.length} web sources`
										: "AI Synthesized"}
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
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors cursor-pointer"
								>
									<RotateCcw className="w-3.5 h-3.5" />
									<span>Clear</span>
								</button>

								<button
									type="button"
									onClick={handleSave}
									className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95"
								>
									{savedFromWeb ? (
										<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
									) : (
										<Save className="w-3.5 h-3.5" />
									)}
									<span>{savedFromWeb ? "Saved to Library!" : "Save"}</span>
								</button>
							</div>
						</div>

						{/* Document Header */}
						<div className="mb-6 max-w-5xl">
							<div className="flex flex-wrap gap-2 mb-2.5">
								<span className="badge badge-accent">
									{webSearch.generatedTopic.category}
								</span>
							</div>
							<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text)]">
								{webSearch.generatedTopic.title}
							</h1>
						</div>

						{/* Document 2-Column Canvas Layout */}
						<div
							className={
								webSearch.searchResults &&
								webSearch.searchResults.results.length > 0
									? "flex flex-col lg:flex-row gap-6 items-start"
									: "w-full max-w-5xl"
							}
						>
							{/* Left Note Content */}
							<div className="flex-1 min-w-0 w-full rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
								<TopicDetail topic={webSearch.generatedTopic} />
							</div>

							{/* Right Sources Card (Web Mode Only) */}
							{webSearch.searchResults &&
								webSearch.searchResults.results.length > 0 && (
									<aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-4 rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
										<div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Globe className="w-4 h-4 text-emerald-500" />
												<span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
													Web Sources
												</span>
											</div>
											<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--muted)]">
												{webSearch.searchResults.results.length}
											</span>
										</div>

										<div className="divide-y divide-[var(--border)] max-h-[calc(100vh-220px)] overflow-y-auto">
											{webSearch.searchResults.results
												.slice(0, 8)
												.map((r, i) => (
													<a
														// biome-ignore lint/suspicious/noArrayIndexKey: stable source list
														key={i}
														href={r.url}
														target="_blank"
														rel="noopener noreferrer"
														className="flex items-start gap-3 p-3.5 hover:bg-[var(--surface-2)] transition-colors group"
													>
														<div className="flex-1 min-w-0">
															<p className="font-semibold text-xs leading-snug line-clamp-2 mb-1 group-hover:text-emerald-500 transition-colors text-[var(--text)]">
																{r.title}
															</p>
															<p className="text-[11px] leading-relaxed line-clamp-2 mb-1.5 text-[var(--muted)]">
																{r.snippet}
															</p>
															<span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate max-w-full bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
																{r.source || new URL(r.url).hostname}
															</span>
														</div>
														<ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity text-[var(--muted)]" />
													</a>
												))}
										</div>
									</aside>
								)}
						</div>
					</div>
				)}

				{/* ── STATE 2: Category Filtered Topics (Only when explicitly viewing a category) ── */}
				{isCategoryView && (
					<div className="max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-200">
						{/* Header */}
						<div className="flex items-center justify-between px-3 py-2 mb-4 border-b border-[var(--border)]">
							<span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
								{activeCategory} · {categoryTopics.length}{" "}
								{categoryTopics.length === 1 ? "Note" : "Notes"}
							</span>
							<button
								type="button"
								onClick={() => {
									setActiveCategory("All");
									navigate("/");
								}}
								className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline cursor-pointer"
							>
								Back to Home
							</button>
						</div>

						{/* List Rows */}
						{loading ? (
							<div className="flex items-center justify-center py-16">
								<Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
							</div>
						) : categoryTopics.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
								<Search className="w-10 h-10 mb-3 text-[var(--muted)] opacity-40" />
								<p className="text-sm font-medium text-[var(--text)]">
									No saved notes in {activeCategory}
								</p>
								<p className="text-xs mt-1 text-[var(--muted)]">
									Enter a topic in the prompt bar below to generate notes
								</p>
							</div>
						) : (
							<div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
								{categoryTopics.map((topic) => (
									<TopicRow key={topic.id} topic={topic} />
								))}
							</div>
						)}
					</div>
				)}

				{/* ── STATE 3: ChatGPT Hero Landing Screen (Default Clean State) ── */}
				{!webSearch.generatedTopic && !isCategoryView && (
					<div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] px-4 sm:px-6 text-center animate-in fade-in duration-300">
						{/* Centered Heading */}
						<h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[var(--text)] mb-8">
							What's on the agenda today?
						</h1>

						{/* Centered Floating Prompt Capsule */}
						<div className="w-full max-w-3xl mb-8">
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
								focusTrigger={searchFocusTrigger}
							/>
						</div>

						{/* Quick Action Suggestion Chips */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl text-left">
							{SUGGESTIONS.map((s, i) => (
								<button
									// biome-ignore lint/suspicious/noArrayIndexKey: static suggestion list
									key={i}
									type="button"
									onClick={() => handleSearch(s.title, webEnabled)}
									className="flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all cursor-pointer text-left group shadow-sm hover:shadow"
								>
									<span className="text-xl flex-shrink-0">{s.icon}</span>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-bold text-[var(--text)] group-hover:text-emerald-500 transition-colors truncate">
											{s.title}
										</p>
										<p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
											{s.desc}
										</p>
									</div>
									<ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity self-center flex-shrink-0" />
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* ── Bottom Persistent Prompt Bar (When In Topic Document View or Category View) ── */}
			{(webSearch.generatedTopic || isCategoryView) && (
				<div className="p-3 sm:px-6 pb-4 sm:pb-5 pt-2 flex-shrink-0 relative z-30 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
					<div className="max-w-4xl mx-auto w-full">
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
							focusTrigger={searchFocusTrigger}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
