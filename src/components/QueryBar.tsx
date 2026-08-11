import {
	Globe,
	History,
	Loader2,
	Search,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}: QueryBarProps) {
	const { llmConfigured } = useSettings();
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFocused, setIsFocused] = useState(false);

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
		if (e.key === "Enter" && value.trim()) {
			onSearch(value.trim(), webEnabled);
		}
	};

	return (
		<div className="relative" ref={containerRef}>
			<div className="ws-querybar">
				{/* Search icon */}
				<Search
					className="w-4 h-4 flex-shrink-0"
					style={{ color: "var(--muted)" }}
				/>

				<input
					ref={inputRef}
					type="text"
					value={value}
					onFocus={() => setIsFocused(true)}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKey}
					placeholder={
						webEnabled
							? "Search the web and generate study note…"
							: "Enter a topic to generate a study note…"
					}
					className="flex-1 min-w-0 bg-transparent outline-none text-sm"
					style={{
						color: "var(--text)",
						caretColor: "var(--accent)",
					}}
					aria-label="Research query"
				/>

				{/* Clear */}
				{value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
						style={{ color: "var(--faint)" }}
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}

				{/* Divider */}
				<div
					className="w-px self-stretch mx-1"
					style={{ background: "var(--border)" }}
				/>

				{/* Source toggles */}
				{llmConfigured && (
					<div
						className="flex rounded overflow-hidden flex-shrink-0"
						style={{ border: "1px solid var(--border)", fontSize: "0.75rem" }}
					>
						<button
							type="button"
							onClick={() => onToggleWeb(false)}
							className="flex items-center gap-1 px-2 py-1 transition-colors"
							style={{
								background: !webEnabled ? "var(--accent)" : "transparent",
								color: !webEnabled ? "#fff" : "var(--muted)",
							}}
							title="Generate with AI only"
						>
							<Zap className="w-3 h-3" />
							<span className="hidden sm:inline">AI Only</span>
						</button>
						<button
							type="button"
							onClick={() => onToggleWeb(true)}
							className="flex items-center gap-1 px-2 py-1 transition-colors"
							style={{
								background: webEnabled ? "var(--accent)" : "transparent",
								color: webEnabled ? "#fff" : "var(--muted)",
							}}
							title="Search web then generate"
						>
							<Globe className="w-3 h-3" />
							<span className="hidden sm:inline">+ Web</span>
						</button>
					</div>
				)}

				{/* Generate button */}
				{llmConfigured && (
					<button
						type="button"
						disabled={loading || !value.trim()}
						onClick={() => value.trim() && onSearch(value.trim(), webEnabled)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: "var(--accent)",
							color: "#fff",
							fontSize: "0.8125rem",
						}}
					>
						{loading ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<Sparkles className="w-3.5 h-3.5" />
						)}
						<span className="hidden sm:inline">
							{loading ? stage || "Generating…" : "Generate"}
						</span>
					</button>
				)}

				{!llmConfigured && (
					<a
						href="/settings"
						className="text-xs px-2 py-1 rounded"
						style={{
							background: "var(--warn-bg)",
							color: "var(--warn)",
							flexShrink: 0,
						}}
					>
						Add API key
					</a>
				)}
			</div>

			{/* Progress bar */}
			{loading && (
				<div className="ws-progress">
					<div
						className={`ws-progress-fill ${progress > 0 && progress < 100 ? "" : "animate"}`}
						style={{ width: progress > 0 ? `${progress}%` : undefined }}
					/>
				</div>
			)}

			{/* History Dropdown */}
			{isFocused && history && history.length > 0 && !value.trim() && (
				<div
					className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg overflow-hidden z-50 border"
					style={{ background: "var(--surface)", borderColor: "var(--border)" }}
				>
					<div
						className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b"
						style={{ color: "var(--faint)", borderColor: "var(--border)" }}
					>
						Recent Searches
					</div>
					<ul className="max-h-64 overflow-y-auto">
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
									className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface)] border-0 cursor-pointer"
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
		</div>
	);
}
