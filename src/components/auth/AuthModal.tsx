import {
	AlertCircle,
	Eye,
	EyeOff,
	GraduationCap,
	Loader2,
	Lock,
	Mail,
	ShieldCheck,
	UserPlus,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface AuthModalProps {
	isOpen: boolean;
	onClose?: () => void;
	canDismiss?: boolean;
}

export default function AuthModal({
	isOpen,
	onClose,
	canDismiss = false,
}: AuthModalProps) {
	const { login, register } = useAuth();
	const [tab, setTab] = useState<"login" | "register">("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			setError("Please enter your email address.");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		if (tab === "register" && password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			if (tab === "login") {
				await login(trimmedEmail, password);
			} else {
				await register(trimmedEmail, password);
			}
			onClose?.();
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Authentication failed. Please verify your credentials.";
			setError(msg);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-title"
		>
			<div
				className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all flex flex-col z-10"
				style={{
					backgroundColor: "var(--surface)",
					borderColor: "var(--border)",
				}}
			>
				{/* Top Branding Header */}
				<div
					className="px-6 pt-6 pb-4 border-b text-center relative"
					style={{ borderColor: "var(--border)" }}
				>
					<div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-3 ring-4 ring-emerald-500/10">
						<GraduationCap className="w-6 h-6" />
					</div>
					<h2
						id="auth-title"
						className="text-xl font-bold tracking-tight text-[var(--text)]"
					>
						{tab === "login"
							? "Sign In to Your Workspace"
							: "Create Your Account"}
					</h2>

					{/* Tab Switcher */}
					<div
						className="flex rounded-xl p-1 mt-4 border"
						style={{
							backgroundColor: "var(--surface-2)",
							borderColor: "var(--border)",
						}}
					>
						<button
							type="button"
							onClick={() => {
								setTab("login");
								setError(null);
							}}
							className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
								tab === "login"
									? "shadow-sm border font-bold"
									: "text-[var(--muted)] hover:text-[var(--text)]"
							}`}
							style={
								tab === "login"
									? {
											backgroundColor: "var(--surface)",
											borderColor: "var(--border)",
											color: "var(--text)",
										}
									: undefined
							}
						>
							Sign In
						</button>
						<button
							type="button"
							onClick={() => {
								setTab("register");
								setError(null);
							}}
							className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
								tab === "register"
									? "shadow-sm border font-bold"
									: "text-[var(--muted)] hover:text-[var(--text)]"
							}`}
							style={
								tab === "register"
									? {
											backgroundColor: "var(--surface)",
											borderColor: "var(--border)",
											color: "var(--text)",
										}
									: undefined
							}
						>
							Create Account
						</button>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Email Input */}
					<div className="space-y-1.5">
						<label
							htmlFor="auth-email"
							className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider block"
						>
							Email Address
						</label>
						<div className="relative">
							<Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
							<input
								id="auth-email"
								type="email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (error) setError(null);
								}}
								placeholder="name@example.com"
								className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border text-[var(--text)] placeholder-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
								style={{
									backgroundColor: "var(--surface-2)",
									borderColor: "var(--border)",
								}}
								autoComplete="email"
								required
							/>
						</div>
					</div>

					{/* Password Input */}
					<div className="space-y-1.5">
						<label
							htmlFor="auth-password"
							className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider block"
						>
							Password
						</label>
						<div className="relative">
							<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
							<input
								id="auth-password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									if (error) setError(null);
								}}
								placeholder="At least 8 characters"
								className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border text-[var(--text)] placeholder-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
								style={{
									backgroundColor: "var(--surface-2)",
									borderColor: "var(--border)",
								}}
								autoComplete={
									tab === "login" ? "current-password" : "new-password"
								}
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1"
								tabIndex={-1}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</button>
						</div>
					</div>

					{/* Confirm Password (Register only) */}
					{tab === "register" && (
						<div className="space-y-1.5 animate-fadeIn">
							<label
								htmlFor="auth-confirm-password"
								className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider block"
							>
								Confirm Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
								<input
									id="auth-confirm-password"
									type={showPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value);
										if (error) setError(null);
									}}
									placeholder="Re-enter your password"
									className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border text-[var(--text)] placeholder-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
									style={{
										backgroundColor: "var(--surface-2)",
										borderColor: "var(--border)",
									}}
									autoComplete="new-password"
									required
								/>
							</div>
						</div>
					)}

					{/* Error Alert */}
					{error && (
						<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-fadeIn">
							<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
							<span className="font-medium">{error}</span>
						</div>
					)}

					{/* Info Callout */}
					<div
						className="p-3 rounded-xl border text-[11px] text-[var(--muted)] flex items-start gap-2.5 leading-relaxed"
						style={{
							backgroundColor: "var(--surface-2)",
							borderColor: "var(--border)",
						}}
					>
						<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
						<span>
							Each user account has an isolated, encrypted key vault. Your notes
							and API credentials will never leak to other users or devices.
						</span>
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isLoading || !email.trim() || !password}
						className="w-full py-3 px-4 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								{tab === "login" ? "Signing In..." : "Creating Account..."}
							</>
						) : tab === "login" ? (
							<>
								<Lock className="w-4 h-4" />
								Sign In
							</>
						) : (
							<>
								<UserPlus className="w-4 h-4" />
								Create Account & Get Started
							</>
						)}
					</button>

					{canDismiss && onClose && (
						<div className="text-center pt-1">
							<button
								type="button"
								onClick={onClose}
								className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
							>
								Continue as Guest (Read-Only)
							</button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
