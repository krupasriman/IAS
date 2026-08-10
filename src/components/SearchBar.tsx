import { Globe, Loader2, Search, X } from "lucide-react";
import { useRef } from "react";
import { useSettings } from "../hooks/useSettings";

interface SearchBarProps {
	value: string;
	onChange: (val: string) => void;
	onSearch: (query: string, webSearchEnabled: boolean) => void;
	webSearchEnabled: boolean;
	onToggleWebSearch: (enabled: boolean) => void;
	loading?: boolean;
}

export default function SearchBar({
	value,
	onChange,
	onSearch,
	webSearchEnabled,
	onToggleWebSearch,
	loading = false,
}: SearchBarProps) {
	const { llmConfigured } = useSettings();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && value.trim()) {
			onSearch(value.trim(), webSearchEnabled);
		}
	};

	const dynamicPlaceholder = webSearchEnabled
		? "Search web..."
		: "Search topic...";

	return (
		<div className="relative w-full max-w-3xl mx-auto">
			<div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-400 transition-all">
				<input
					ref={inputRef}
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={dynamicPlaceholder}
					className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
				/>
				{value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				)}

				{/* Search Actions */}
				<div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
					<button
						type="button"
						onClick={() => {
							onToggleWebSearch(!webSearchEnabled);
							inputRef.current?.focus();
						}}
						title={
							webSearchEnabled ? "Web Search Enabled" : "Enable Web Search"
						}
						className={`flex items-center justify-center p-2 rounded-xl transition-all ${
							webSearchEnabled
								? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
								: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
						}`}
					>
						<Globe className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={() => {
							if (value.trim()) onSearch(value.trim(), webSearchEnabled);
						}}
						title="Search"
						className="flex items-center justify-center p-2 rounded-xl transition-all bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm"
					>
						{loading ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Search className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>

			{!llmConfigured && (
				<p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
					<span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
					AI Search requires an LLM API key in{" "}
					<a href="/settings" className="underline">
						Settings
					</a>
					.
				</p>
			)}
		</div>
	);
}
