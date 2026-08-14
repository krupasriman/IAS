import {
	ArrowUp,
	Globe,
	History,
	Loader2,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSettings } from "../hooks/useSettings";
import type { SearchHistoryItem } from "../hooks/useWebSearch";

interface QueryBarProps {
	value: string;
	onChange: (v: string) => void;
	onSearch: (q: string, webEnabled: boolean) => void;
	webEnabled: boolean;
	onToggleWeb: (v: boolean) => void;
	loading?: boolean;
	stage?: string;
	progress?: number;
	history?: SearchHistoryItem[];
	onLoadHistory?: (item: SearchHistoryItem) => void;
	onRemoveHistory?: (id: string) => void;
	focusTrigger?: number;
}

export default function QueryBar({
	value,
	onChange,
	onSearch,
	webEnabled,
	onToggleWeb,
	loading = false,
	stage = "",
	progress = 0,
	history = [],
	onLoadHistory,
	onRemoveHistory,
	focusTrigger,
}: QueryBarProps) {
	const { llmConfigured } = useSettings();
	const { openSettings } = useWorkspace();
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFocused, setIsFocused] = useState(false);

	useEffect(() => {
		if (focusTrigger && focusTrigger > 0) {
			inputRef.current?.focus();
			inputRef.current?.select();
			setIsFocused(true);
		}
	}, [focusTrigger]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsFocused(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleKey = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && value.trim()) {
			e.preventDefault();
			const q = value.trim();
			onChange("");
			onSearch(q, webEnabled);
		}
	};

	return (
		<div className="relative w-full" ref={containerRef}>
			{/* History Dropdown (Opens BELOW the search field) */}
			{isFocused && history && history.length > 0 && !value.trim() && (
				<div
					className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-50 border backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
					style={{ background: "var(--surface)", borderColor: "var(--border)" }}
				>
					<div
						className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b flex items-center justify-between"
						style={{ color: "var(--faint)", borderColor: "var(--border)" }}
					>
						<span>Recent Searches</span>
						<span className="text-[10px] font-normal normal-case opacity-70">
							Select to reload note
						</span>
					</div>
					<ul
						className="max-h-48 overflow-y-auto divide-y"
						style={{ borderColor: "var(--border)" }}
					>
						{history.map((item) => (
							<li
								key={item.id}
								className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
							>
								<button
									type="button"
									className="flex items-center gap-3 min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
									onClick={() => {
										onLoadHistory?.(item);
										setIsFocused(false);
									}}
								>
									<History
										className="w-4 h-4 flex-shrink-0"
										style={{ color: "var(--muted)" }}
									/>
									<span
										className="text-sm font-medium truncate"
										style={{ color: "var(--text)" }}
									>
										{item.query}
									</span>
								</button>
								<button
									type="button"
									className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-3)] border-0 cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										onRemoveHistory?.(item.id);
									}}
									title="Remove from history"
								>
									<X
										className="w-3.5 h-3.5"
										style={{ color: "var(--muted)" }}
									/>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Main ChatGPT-style Floating Search Capsule */}
			<div
				className="rounded-3xl border transition-all duration-200 shadow-md relative overflow-hidden bg-[var(--surface)]"
				style={{
					borderColor: isFocused ? "var(--muted)" : "var(--border)",
					boxShadow: isFocused
						? "0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--border)"
						: undefined,
				}}
			>
				{/* Progress bar running along the top edge of the card */}
				{loading && (
					<div className="absolute top-0 left-0 right-0 h-1 bg-[var(--surface-3)] overflow-hidden">
						<div
							className={`h-full bg-emerald-500 transition-all duration-300 ${
								progress > 0 && progress < 100 ? "" : "animate-pulse"
							}`}
							style={{
								width: progress > 0 ? `${progress}%` : "100%",
							}}
						/>
					</div>
				)}

				<div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
					{/* ChatGPT Plus / Attach Trigger */}
					<button
						type="button"
						className="w-8 h-8 rounded-full hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0"
						title="IAS Topic Research Tools"
					>
						<Sparkles className="w-4 h-4 text-emerald-500" />
					</button>

					{/* Text Input */}
					<input
						ref={inputRef}
						type="text"
						value={value}
						onFocus={() => setIsFocused(true)}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={handleKey}
						placeholder={
							loading
								? stage || "Researching & generating study note…"
								: webEnabled
									? "Search the web and generate IAS study note…"
									: "Ask anything or enter a UPSC topic…"
						}
						disabled={loading}
						className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-[var(--faint)] leading-normal"
						style={{
							color: "var(--text)",
							caretColor: "var(--accent)",
						}}
						aria-label="Research query"
					/>

					{/* Clear 'X' */}
					{value && !loading && (
						<button
							type="button"
							onClick={() => onChange("")}
							className="p-1.5 rounded-full hover:bg-[var(--surface-2)] transition-colors flex-shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
							title="Clear input"
						>
							<X className="w-4 h-4" />
						</button>
					)}

					{/* Source Toggles (AI Only vs + Web) */}
					{llmConfigured && (
						<div
							className="flex rounded-full p-0.5 flex-shrink-0 border border-[var(--border)]"
							style={{ background: "var(--surface-2)" }}
						>
							<button
								type="button"
								onClick={() => onToggleWeb(false)}
								className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
								style={{
									background: !webEnabled ? "var(--surface)" : "transparent",
									color: !webEnabled ? "var(--text)" : "var(--muted)",
									boxShadow: !webEnabled
										? "0 1px 3px rgba(0,0,0,0.08)"
										: "none",
								}}
								title="Generate with AI only"
							>
								<Zap
									className="w-3 h-3"
									style={{ color: !webEnabled ? "var(--accent)" : undefined }}
								/>
								<span className="hidden sm:inline">AI Only</span>
							</button>
							<button
								type="button"
								onClick={() => onToggleWeb(true)}
								className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
								style={{
									background: webEnabled ? "var(--surface)" : "transparent",
									color: webEnabled ? "var(--text)" : "var(--muted)",
									boxShadow: webEnabled ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
								}}
								title="Search live web then generate"
							>
								<Globe
									className="w-3 h-3"
									style={{ color: webEnabled ? "var(--accent)" : undefined }}
								/>
								<span className="hidden sm:inline">+ Web</span>
							</button>
						</div>
					)}

					{/* Circular ChatGPT Send Button */}
					{llmConfigured && (
						<button
							type="button"
							disabled={loading || !value.trim()}
							onClick={() => {
								if (value.trim()) {
									const q = value.trim();
									onChange("");
									onSearch(q, webEnabled);
								}
							}}
							className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shadow-sm hover:scale-105 active:scale-95 bg-[var(--text)] text-[var(--bg)]"
							title="Send prompt"
						>
							{loading ? (
								<Loader2 className="w-4 h-4 animate-spin text-[var(--bg)]" />
							) : (
								<ArrowUp className="w-4 h-4 text-[var(--bg)] stroke-[2.5]" />
							)}
						</button>
					)}

					{!llmConfigured && (
						<button
							type="button"
							onClick={openSettings}
							className="text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
							style={{
								background: "var(--warn-bg)",
								color: "var(--warn)",
							}}
						>
							Add API key
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
