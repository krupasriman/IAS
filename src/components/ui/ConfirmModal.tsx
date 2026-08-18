import { AlertTriangle, HelpCircle, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

export interface ConfirmModalProps {
	isOpen: boolean;
	title: string;
	message: string | React.ReactNode;
	confirmText?: string;
	cancelText?: string;
	variant?: "danger" | "warning" | "primary";
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmModal({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "danger",
	onConfirm,
	onCancel,
}: ConfirmModalProps) {
	// Handle ESC key to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const getIcon = () => {
		switch (variant) {
			case "danger":
				return <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />;
			case "warning":
				return (
					<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
				);
			default:
				return <HelpCircle className="w-5 h-5 text-[var(--accent)]" />;
		}
	};

	const getIconBg = () => {
		switch (variant) {
			case "danger":
				return "bg-red-500/10 border-red-500/20";
			case "warning":
				return "bg-amber-500/10 border-amber-500/20";
			default:
				return "bg-emerald-500/10 border-emerald-500/20";
		}
	};

	const getConfirmButtonClasses = () => {
		switch (variant) {
			case "danger":
				return "bg-red-600 hover:bg-red-700 text-white shadow-xs";
			case "warning":
				return "bg-amber-600 hover:bg-amber-700 text-white shadow-xs";
			default:
				return "bg-[var(--accent)] hover:opacity-90 text-white shadow-xs";
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
				onClick={onCancel}
				aria-hidden="true"
			/>

			{/* Dialog Card */}
			<div
				className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border)",
				}}
			>
				{/* Content area */}
				<div className="p-6">
					<div className="flex items-start gap-4">
						<div
							className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${getIconBg()}`}
						>
							{getIcon()}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-base font-bold text-[var(--text)]">
									{title}
								</h3>
								<button
									type="button"
									onClick={onCancel}
									className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="mt-2 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
								{message}
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="px-6 py-4 bg-[var(--surface-2)]/40 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all cursor-pointer shadow-xs"
					>
						{cancelText}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${getConfirmButtonClasses()}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
