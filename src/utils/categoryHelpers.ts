import { Landmark, Building2, TrendingUp, Users, Globe, Scale, Compass, Leaf, Cpu, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CategoryType } from '../types/topic.types';
import { CATEGORIES } from '../data/categories';

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
  BookOpen
};

export function getCategoryInfo(category: CategoryType): CategoryVisualInfo {
  const found = CATEGORIES.find(c => c.id === category);
  return {
    id: category,
    name: found?.name ?? category,
    bgLight: found?.bgLight ?? 'bg-slate-50 text-slate-700',
    textColor: found?.color ?? 'text-slate-700',
    gradient: getGradient(category),
    icon: found ? ICON_MAP[found.iconName] ?? BookOpen : BookOpen
  };
}

function getGradient(category: CategoryType): string {
  const gradients: Record<string, string> = {
    Polity: 'from-blue-500 to-indigo-500',
    Governance: 'from-indigo-500 to-violet-500',
    Economy: 'from-emerald-500 to-teal-500',
    Society: 'from-purple-500 to-fuchsia-500',
    IR: 'from-sky-500 to-cyan-500',
    Ethics: 'from-amber-500 to-orange-500',
    Geography: 'from-teal-500 to-green-500',
    Environment: 'from-green-500 to-lime-500',
    'Science & Tech': 'from-cyan-500 to-blue-500',
    History: 'from-orange-500 to-red-500'
  };
  return gradients[category] || 'from-slate-500 to-slate-600';
}

export { CATEGORIES };