import {
	BookOpen,
	GraduationCap,
	Home,
	PlusCircle,
	Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Left: Logo */}
					<div className="flex items-center gap-3">
						<Link to="/" className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
								<GraduationCap className="w-5 h-5 text-white" />
							</div>
							<div className="leading-tight">
								<div className="font-bold text-lg text-slate-900 tracking-tight">
									IAS Study
								</div>
								<div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
									Mains Framework
								</div>
							</div>
						</Link>
					</div>

					{/* Center: Nav */}
					<nav className="hidden md:flex items-center gap-1">
						<Link
							to="/"
							className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
						>
							<Home className="w-4 h-4" />
							Dashboard
						</Link>
						<Link
							to="/add"
							className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
						>
							<PlusCircle className="w-4 h-4" />
							New Topic
						</Link>
						<Link
							to="/topics"
							className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
						>
							<BookOpen className="w-4 h-4" />
							All Topics
						</Link>
					</nav>

					{/* Right: Settings */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => navigate("/settings")}
							className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
							title="Settings"
						>
							<Settings className="w-4 h-4" />
							<span className="hidden sm:inline">Settings</span>
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
