import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	BookOpen,
	Building2,
	Compass,
	Cpu,
	Globe,
	GraduationCap,
	Landmark,
	Leaf,
	Scale,
	ShieldAlert,
	TrendingUp,
	Users,
} from "lucide-react";
import { CATEGORIES } from "../data/categories";
import type { CategoryType } from "../types/topic.types";

export interface CategoryVisualInfo {
	id: CategoryType;
	name: string;
	bgLight: string;
	textColor: string;
	gradient: string;
	icon: LucideIcon;
}

const ICON_MAP: Record<string, LucideIcon> = {
	Landmark,
	Building2,
	TrendingUp,
	Users,
	Globe,
	Scale,
	Compass,
	Leaf,
	Cpu,
	BookOpen,
	ShieldAlert,
	GraduationCap,
	AlertTriangle,
};

export function getCategoryInfo(category: CategoryType): CategoryVisualInfo {
	const found = CATEGORIES.find((c) => c.id === category);
	return {
		id: category,
		name: found?.name ?? category,
		bgLight: found?.bgLight ?? "bg-slate-50 text-slate-700",
		textColor: found?.color ?? "text-slate-700",
		gradient: getGradient(category),
		icon: found ? (ICON_MAP[found.iconName] ?? BookOpen) : BookOpen,
	};
}

function getGradient(category: CategoryType): string {
	const gradients: Record<string, string> = {
		Polity: "from-blue-500 to-indigo-500",
		Governance: "from-indigo-500 to-violet-500",
		Economy: "from-emerald-500 to-teal-500",
		Society: "from-purple-500 to-fuchsia-500",
		IR: "from-sky-500 to-cyan-500",
		Ethics: "from-amber-500 to-orange-500",
		Geography: "from-teal-500 to-green-500",
		Environment: "from-green-500 to-lime-500",
		"Science & Tech": "from-cyan-500 to-blue-500",
		History: "from-orange-500 to-red-500",
		"Internal Security": "from-rose-500 to-red-600",
		Sociology: "from-violet-500 to-purple-600",
		"Disaster Management": "from-amber-500 to-orange-600",
	};
	return gradients[category] || "from-slate-500 to-slate-600";
}

export function getGsPaper(category: CategoryType): string {
	switch (category) {
		case "History":
		case "Geography":
		case "Society":
		case "Sociology":
			return "GS Paper I";
		case "Polity":
		case "Governance":
		case "IR":
			return "GS Paper II";
		case "Economy":
		case "Environment":
		case "Science & Tech":
		case "Internal Security":
		case "Disaster Management":
			return "GS Paper III";
		case "Ethics":
			return "GS Paper IV";
		default:
			return "GS Mains";
	}
}

export function calculateReadTime(topic?: {
	meaning?: string;
	quote?: { text?: string; source?: string };
	pros?: { title?: string; explanation?: string; example?: string }[];
	cons?: { title?: string; explanation?: string; example?: string }[];
	wayForward?: string[] | string;
	conclusion?: { negative?: string; positive?: string } | string;
}): string {
	if (!topic) return "2 min read";
	let totalWords = 0;
	if (topic.meaning) totalWords += topic.meaning.split(/\s+/).length;
	if (topic.quote?.text) totalWords += topic.quote.text.split(/\s+/).length;
	if (topic.pros) {
		for (const p of topic.pros) {
			if (p.title) totalWords += p.title.split(/\s+/).length;
			if (p.explanation) totalWords += p.explanation.split(/\s+/).length;
			if (p.example) totalWords += p.example.split(/\s+/).length;
		}
	}
	if (topic.cons) {
		for (const c of topic.cons) {
			if (c.title) totalWords += c.title.split(/\s+/).length;
			if (c.explanation) totalWords += c.explanation.split(/\s+/).length;
			if (c.example) totalWords += c.example.split(/\s+/).length;
		}
	}
	if (Array.isArray(topic.wayForward)) {
		for (const w of topic.wayForward) totalWords += w.split(/\s+/).length;
	} else if (topic.wayForward) {
		totalWords += topic.wayForward.split(/\s+/).length;
	}
	if (typeof topic.conclusion === "string") {
		totalWords += topic.conclusion.split(/\s+/).length;
	} else if (topic.conclusion) {
		if (topic.conclusion.negative)
			totalWords += topic.conclusion.negative.split(/\s+/).length;
		if (topic.conclusion.positive)
			totalWords += topic.conclusion.positive.split(/\s+/).length;
	}
	const minutes = Math.max(1, Math.ceil(totalWords / 180));
	return `${minutes} min read`;
}

export { CATEGORIES };
