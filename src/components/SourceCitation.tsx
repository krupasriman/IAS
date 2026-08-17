import {
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Globe,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { WebSearchResultItem } from "../types/search.types";

interface SourceItemProps {
	sources: WebSearchResultItem[];
	className?: string;
}

import {
	getDisplaySourceName,
	getFaviconUrl,
	getHostname,
} from "../utils/sourceHelpers";

export function SourcePill({
	sources,
	label,
	className = "",
}: {
	sources: WebSearchResultItem[];
	label?: string;
	className?: string;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [imageError, setImageError] = useState(false);
	const [alignRight, setAlignRight] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Smart positioning to prevent horizontal cutoff
	useEffect(() => {
		if (isOpen && containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const screenWidth = window.innerWidth;
			// If pill is too close to right edge (< 340px available), align popup to right
			if (rect.left + 340 > screenWidth) {
				setAlignRight(true);
			} else {
				setAlignRight(false);
			}
		}
	}, [isOpen]);

	// Close on outside click
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const activeSource = sources[currentIndex] || sources[0];
	if (!activeSource) return null;

	const displayName = label || getDisplaySourceName(activeSource);
	const extraCount = sources.length - 1;

	const handlePrev = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sources.length - 1));
	};

	const handleNext = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentIndex((prev) => (prev < sources.length - 1 ? prev + 1 : 0));
	};

	return (
		<div
			className={`relative inline-block text-left ${className}`}
			ref={containerRef}
		>
			{/* Pill Button */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${
					isOpen
						? "bg-[var(--surface-3)] border-[var(--muted)] shadow-sm"
						: "bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border-[var(--border)] text-[var(--text)]"
				}`}
				title={`View source: ${activeSource.title}`}
			>
				{!imageError ? (
					<img
						src={getFaviconUrl(activeSource.url)}
						alt=""
						className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
						onError={() => setImageError(true)}
					/>
				) : (
					<Globe className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
				)}

				<span className="truncate max-w-[140px] text-[11px] font-semibold text-[var(--text)]">
					{displayName}
				</span>

				{extraCount > 0 && (
					<span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
						+{extraCount}
					</span>
				)}
			</button>

			{/* ChatGPT-style Popover Preview Card */}
			{isOpen && (
				<div
					className={`absolute top-full ${
						alignRight ? "right-0" : "left-0"
					} mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150`}
					style={{
						backgroundColor: "var(--surface)",
						borderColor: "var(--border)",
						boxShadow:
							"0 12px 36px -4px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border)",
					}}
				>
					{/* Header bar with navigation & close */}
					<div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
						{/* Multi-source navigation if more than 1 source */}
						{sources.length > 1 ? (
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={handlePrev}
									className="p-1 rounded-lg hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
									title="Previous source"
								>
									<ChevronLeft className="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onClick={handleNext}
									className="p-1 rounded-lg hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
									title="Next source"
								>
									<ChevronRight className="w-3.5 h-3.5" />
								</button>
								<span className="text-[11px] font-semibold ml-1 text-[var(--muted)]">
									{currentIndex + 1} of {sources.length}
								</span>
							</div>
						) : (
							<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
								Web Source
							</span>
						)}

						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="p-1 rounded-lg hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer ml-auto"
							title="Close preview"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>

					{/* Popover Content */}
					<div className="p-4 space-y-2.5">
						{/* Source Branding */}
						<div className="flex items-center gap-2">
							<img
								src={getFaviconUrl(activeSource.url)}
								alt=""
								className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
								onError={(e) => {
									(e.target as HTMLElement).style.display = "none";
								}}
							/>
							<span className="text-xs font-bold text-[var(--text)] truncate">
								{getDisplaySourceName(activeSource)}
							</span>
							<span className="text-[11px] text-[var(--muted)] truncate">
								· {getHostname(activeSource.url)}
							</span>
						</div>

						{/* Article Title Link */}
						<a
							href={activeSource.url}
							target="_blank"
							rel="noopener noreferrer"
							className="block font-semibold text-sm leading-snug text-[var(--text)] hover:text-emerald-500 transition-colors group"
						>
							<span className="line-clamp-2">{activeSource.title}</span>
						</a>

						{/* Snippet */}
						{activeSource.snippet && (
							<p className="text-xs leading-relaxed text-[var(--muted)] line-clamp-3">
								{activeSource.snippet}
							</p>
						)}

						{/* Action Link Footer */}
						<div className="pt-2 border-t border-[var(--border)] flex items-center justify-end">
							<a
								href={activeSource.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors group"
							>
								<span>Visit Source</span>
								<ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
							</a>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export function SourcesBar({ sources, className = "" }: SourceItemProps) {
	if (!sources || sources.length === 0) return null;

	return (
		<div className={`flex flex-wrap items-center gap-2 py-2 px-1 ${className}`}>
			<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] mr-1">
				<Globe className="w-3.5 h-3.5 text-emerald-500" />
				<span>Sources</span>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				{sources.slice(0, 6).map((source, index) => (
					<SourcePill
						// biome-ignore lint/suspicious/noArrayIndexKey: stable source list
						key={index}
						sources={[source]}
					/>
				))}

				{sources.length > 6 && (
					<SourcePill
						sources={sources.slice(6)}
						label={`+${sources.length - 6} more`}
					/>
				)}
			</div>
		</div>
	);
}
