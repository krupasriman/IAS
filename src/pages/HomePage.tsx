import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock,
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
import SaveCategoryModal from "../components/SaveCategoryModal";
import TopicDetail from "../components/TopicDetail";
import TopicRow from "../components/TopicRow";
import { useWorkspace } from "../context/WorkspaceContext";
import { useTopics } from "../hooks/useTopics";
import { useWebSearch } from "../hooks/useWebSearch";
import type { CategoryType } from "../types/topic.types";
import {
	calculateReadTime,
	getCategoryInfo,
	getGsPaper,
} from "../utils/categoryHelpers";

export default function HomePage() {
	const { topics, loading, addTopic } = useTopics();
	const {
		newTopicCounter,
		pendingLoadHistoryItem,
		clearPendingLoadHistoryItem,
		addToSearchHistory,
		categorySelectCounter,
	} = useWorkspace();
	const location = useLocation();
	const navigate = useNavigate();

	// Read category from URL ?cat=...
	const searchParams = new URLSearchParams(location.search);
	const urlCat = searchParams.get("cat") as CategoryType | null;

	const [query, setQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<"All" | CategoryType>(
		urlCat ?? "All",
	);

	// Ensure legacy localStorage search state is removed
	useEffect(() => {
		try {
			localStorage.removeItem("ias_web_search_state");
		} catch {}
	}, []);
	const [webEnabled, setWebEnabled] = useState(() => {
		try {
			const saved = localStorage.getItem("ias_web_search_enabled");
			return saved !== null ? saved === "true" : true;
		} catch {
			return true;
		}
	});
	const [savedFromWeb, setSavedFromWeb] = useState(false);
	const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
	const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
	const lastHandledNewTopic = useRef(0);
	const lastHandledCatSelect = useRef(0);
	const lastUrlCat = useRef<CategoryType | null>(urlCat);

	const webSearch = useWebSearch({
		onSuccess: (topic) => {
			addToSearchHistory(query || topic.title, topic, webSearch.searchResults);
		},
	});

	const handleToggleWeb = (v: boolean) => {
		setWebEnabled(v);
		try {
			localStorage.setItem("ias_web_search_enabled", String(v));
		} catch {}
	};

	// 1. Handle loading from history (via sidebar click or dropdown)
	useEffect(() => {
		if (pendingLoadHistoryItem) {
			webSearch.loadFromHistory(pendingLoadHistoryItem);
			setActiveCategory("All");
			clearPendingLoadHistoryItem();
		}
	}, [
		pendingLoadHistoryItem,
		webSearch.loadFromHistory,
		clearPendingLoadHistoryItem,
	]);

	// 2. Handle "+ New Topic" action
	useEffect(() => {
		if (newTopicCounter > lastHandledNewTopic.current) {
			lastHandledNewTopic.current = newTopicCounter;

			if (webSearch.generatedTopic) {
				addToSearchHistory(
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
	}, [
		newTopicCounter,
		webSearch.generatedTopic,
		webSearch.searchResults,
		webSearch.reset,
		query,
		addToSearchHistory,
	]);

	// 3. Handle explicit category selection from sidebar
	useEffect(() => {
		if (categorySelectCounter > lastHandledCatSelect.current) {
			lastHandledCatSelect.current = categorySelectCounter;

			if (webSearch.generatedTopic) {
				addToSearchHistory(
					query || webSearch.generatedTopic.title,
					webSearch.generatedTopic,
					webSearch.searchResults,
				);
				webSearch.reset();
			}
		}
	}, [
		categorySelectCounter,
		webSearch.generatedTopic,
		webSearch.searchResults,
		webSearch.reset,
		query,
		addToSearchHistory,
	]);

	// 4. Sync URL category param (when URL ?cat=... changes directly)
	useEffect(() => {
		if (urlCat !== lastUrlCat.current) {
			lastUrlCat.current = urlCat;
			if (urlCat) {
				setActiveCategory(urlCat);
			} else {
				setActiveCategory("All");
			}
		}
	}, [urlCat]);

	const handleSearch = (q: string, web: boolean) => {
		setQuery("");
		if (web)
			webSearch
				.process(q, activeCategory !== "All" ? activeCategory : undefined)
				.then((res) => {
					if (res?.topic) {
						addToSearchHistory(q, res.topic, webSearch.searchResults);
					}
				});
		else
			webSearch
				.processLLMOnly(
					q,
					activeCategory !== "All" ? activeCategory : undefined,
				)
				.then((res) => {
					if (res?.topic) {
						addToSearchHistory(q, res.topic, null);
					}
				});
	};

	const handleSaveClick = () => {
		if (webSearch.generatedTopic) {
			setIsSaveModalOpen(true);
		}
	};

	const handleConfirmSave = (chosenCategory: CategoryType) => {
		if (webSearch.generatedTopic) {
			const topicToSave = {
				...webSearch.generatedTopic,
				category: chosenCategory,
			};
			addTopic(topicToSave);
			setIsSaveModalOpen(false);
			setSavedFromWeb(true);
			setTimeout(() => {
				setSavedFromWeb(false);
				webSearch.reset();
				handleToggleWeb(false);
				setQuery("");
				navigate(`/topic/${topicToSave.id}`);
			}, 600);
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
				{webSearch.generatedTopic &&
					(() => {
						const catInfo = getCategoryInfo(webSearch.generatedTopic.category);
						const CatIcon = catInfo.icon;
						const gsPaper = getGsPaper(webSearch.generatedTopic.category);
						const readTime = calculateReadTime(webSearch.generatedTopic);

						return (
							<div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
								{/* Document Top Action Bar */}
								<div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--border)]">
									<div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
										<span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
											<Sparkles className="w-3 h-3" />
											Mains Dossier
										</span>
										<span>·</span>
										<span className="flex items-center gap-1 text-[var(--muted)]">
											<Clock className="w-3 h-3" />
											{readTime}
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
											title="Clear note"
										>
											<RotateCcw className="w-3.5 h-3.5" />
											<span>Clear</span>
										</button>

										<button
											type="button"
											onClick={handleSaveClick}
											className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95"
										>
											{savedFromWeb ? (
												<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
											) : (
												<Save className="w-3.5 h-3.5" />
											)}
											<span>
												{savedFromWeb ? "Saved to Library!" : "Save to Library"}
											</span>
										</button>
									</div>
								</div>

								{/* Document Header */}
								<div className="mb-6">
									<div className="flex flex-wrap items-center gap-2 mb-3">
										<button
											type="button"
											onClick={() => setIsSaveModalOpen(true)}
											className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] transition-colors cursor-pointer group"
											title="Click to switch category"
										>
											<CatIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
											<span>{webSearch.generatedTopic.category}</span>
											<span className="text-[10px] text-[var(--muted)] group-hover:text-[var(--text)]">
												▾
											</span>
										</button>

										<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
											{gsPaper}
										</span>

										<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
											<Globe className="w-3 h-3" />
											Live Web Research
										</span>
									</div>

									<h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
										{webSearch.generatedTopic.title}
									</h1>
								</div>

								{/* Single Column Canvas Layout Card */}
								<div className="w-full rounded-2xl shadow-sm border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
									<TopicDetail
										topic={webSearch.generatedTopic}
										sources={webSearch.searchResults?.results}
									/>
								</div>
							</div>
						);
					})()}

				{/* ── STATE 2: Category Filtered Topics (Only when explicitly viewing a category) ── */}
				{isCategoryView && (
					<div className="max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-200">
						{/* Header */}
						<div className="flex items-center justify-between px-1 py-3 mb-5 border-b border-[var(--border)]">
							<div className="flex items-center gap-2.5">
								<h2 className="text-sm font-semibold text-[var(--text)]">
									{activeCategory}
								</h2>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
									{categoryTopics.length}{" "}
									{categoryTopics.length === 1 ? "note" : "notes"}
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									setActiveCategory("All");
									navigate("/");
								}}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text)] border border-[var(--border)] transition-all cursor-pointer shadow-xs active:scale-95"
							>
								<ArrowLeft className="w-3.5 h-3.5" />
								<span>Back to Home</span>
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
								{categoryTopics.map((topic, idx) => (
									<TopicRow
										key={topic.id ? `${topic.id}-${idx}` : `topic-${idx}`}
										topic={topic}
									/>
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
						<div className="w-full max-w-3xl">
							<QueryBar
								value={query}
								onChange={setQuery}
								onSearch={handleSearch}
								webEnabled={webEnabled}
								onToggleWeb={handleToggleWeb}
								loading={isGenerating}
								stage={webSearch.progress.message}
								progress={webSearch.progress.progressPercentage}
								focusTrigger={searchFocusTrigger}
							/>
						</div>
					</div>
				)}
			</div>

			{/* ── Bottom Prompt Bar (Only in Category List View when no topic is currently open) ── */}
			{!webSearch.generatedTopic && isCategoryView && (
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
							focusTrigger={searchFocusTrigger}
						/>
					</div>
				</div>
			)}

			{/* Save Category Modal */}
			{webSearch.generatedTopic && (
				<SaveCategoryModal
					isOpen={isSaveModalOpen}
					suggestedCategory={webSearch.generatedTopic.category}
					topicTitle={webSearch.generatedTopic.title}
					onClose={() => setIsSaveModalOpen(false)}
					onSave={handleConfirmSave}
					onUpdateCategory={webSearch.updateTopicCategory}
				/>
			)}
		</div>
	);
}
