import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	BookOpen,
	Building2,
	Check,
	Compass,
	Cpu,
	Globe,
	GraduationCap,
	Landmark,
	Leaf,
	Scale,
	ShieldAlert,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CATEGORIES } from "../data/categories";
import type { CategoryType } from "../types/topic.types";

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

interface SaveCategoryModalProps {
	isOpen: boolean;
	suggestedCategory: CategoryType;
	topicTitle: string;
	onClose: () => void;
	onSave: (category: CategoryType) => void;
	onUpdateCategory?: (category: CategoryType) => void;
}

export default function SaveCategoryModal({
	isOpen,
	suggestedCategory,
	topicTitle,
	onClose,
	onSave,
	onUpdateCategory,
}: SaveCategoryModalProps) {
	const [selectedCategory, setSelectedCategory] =
		useState<CategoryType>(suggestedCategory);

	// Sync with suggestedCategory when opened
	useEffect(() => {
		if (isOpen) {
			setSelectedCategory(suggestedCategory);
		}
	}, [isOpen, suggestedCategory]);

	// Handle ESC key to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const activeCatInfo = CATEGORIES.find((c) => c.id === selectedCategory);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Dialog Card */}
			<div
				className="relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border)",
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
					<div>
						<h2 className="text-base font-bold text-[var(--text)]">
							Save to Library
						</h2>
						<p className="text-xs text-[var(--muted)] truncate max-w-sm mt-0.5">
							{topicTitle}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
						title="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-6 overflow-y-auto space-y-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
							Choose Category
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{CATEGORIES.map((cat) => {
								const Icon = CAT_ICON_MAP[cat.id] ?? BookOpen;
								const isSelected = selectedCategory === cat.id;
								const isSuggested = suggestedCategory === cat.id;

								return (
									<button
										key={cat.id}
										type="button"
										onClick={() => setSelectedCategory(cat.id)}
										className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
											isSelected
												? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-[var(--text)] ring-1 ring-emerald-500"
												: "border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-2)]"
										}`}
									>
										<div className="flex items-center gap-2.5 min-w-0 flex-1">
											<div
												className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
													isSelected
														? "bg-emerald-500 text-white"
														: "bg-[var(--surface)] text-[var(--muted)]"
												}`}
											>
												<Icon className="w-3.5 h-3.5" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-1.5">
													<p className="text-xs font-semibold truncate text-[var(--text)]">
														{cat.name}
													</p>
												</div>
												{isSuggested && (
													<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
														<Sparkles className="w-2.5 h-2.5" />
														Suggested
													</span>
												)}
											</div>
										</div>

										{isSelected && (
											<Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-1.5" />
										)}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex-wrap gap-2">
					<span className="text-xs text-[var(--muted)]">
						Selected:{" "}
						<strong className="text-[var(--text)]">
							{activeCatInfo?.name || selectedCategory}
						</strong>
					</span>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-3.5 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface-3)] text-[var(--text-2)] transition-colors cursor-pointer"
						>
							Cancel
						</button>
						{onUpdateCategory && (
							<button
								type="button"
								onClick={() => {
									onUpdateCategory(selectedCategory);
									onClose();
								}}
								className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-all cursor-pointer"
								title="Change category on draft without saving yet"
							>
								Set Category
							</button>
						)}
						<button
							type="button"
							onClick={() => onSave(selectedCategory)}
							className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
						>
							<Check className="w-3.5 h-3.5" />
							<span>Confirm & Save</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
