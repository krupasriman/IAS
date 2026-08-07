import type { CategoryType } from '../types/topic.types';

export interface CategoryInfo {
  id: CategoryType;
  name: string;
  description: string;
  color: string;
  bgLight: string;
  borderColor: string;
  iconName: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Polity',
    name: 'Polity & Constitution',
    description: 'Indian Constitution, Governance, Judiciary, Electoral Reforms',
    color: 'text-blue-700',
    bgLight: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200',
    iconName: 'Landmark'
  },
  {
    id: 'Governance',
    name: 'Governance & Public Admin',
    description: 'E-Governance, Transparency, Civil Services, Citizen Charters',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
    borderColor: 'border-indigo-200',
    iconName: 'Building2'
  },
  {
    id: 'Economy',
    name: 'Indian Economy',
    description: 'Fiscal Policy, Banking, Agriculture, Infrastructure, Trade',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
    borderColor: 'border-emerald-200',
    iconName: 'TrendingUp'
  },
  {
    id: 'Society',
    name: 'Indian Society',
    description: 'Diversity, Women Empowerment, Poverty, Population, Caste',
    color: 'text-purple-700',
    bgLight: 'bg-purple-50 hover:bg-purple-100 text-purple-800',
    borderColor: 'border-purple-200',
    iconName: 'Users'
  },
  {
    id: 'IR',
    name: 'International Relations',
    description: 'Bilateral Relations, Foreign Policy, Global Organizations',
    color: 'text-sky-700',
    bgLight: 'bg-sky-50 hover:bg-sky-100 text-sky-800',
    borderColor: 'border-sky-200',
    iconName: 'Globe'
  },
  {
    id: 'Ethics',
    name: 'Ethics & Integrity',
    description: 'Human Values, Aptitude, Moral Thinkers, Probity in Governance',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
    borderColor: 'border-amber-200',
    iconName: 'Scale'
  },
  {
    id: 'Geography',
    name: 'Geography & Resources',
    description: 'Physical Geography, Climatology, Natural Resources',
    color: 'text-teal-700',
    bgLight: 'bg-teal-50 hover:bg-teal-100 text-teal-800',
    borderColor: 'border-teal-200',
    iconName: 'Compass'
  },
  {
    id: 'Environment',
    name: 'Environment & Ecology',
    description: 'Biodiversity, Climate Change, Pollution, Conservation',
    color: 'text-green-700',
    bgLight: 'bg-green-50 hover:bg-green-100 text-green-800',
    borderColor: 'border-green-200',
    iconName: 'Leaf'
  },
  {
    id: 'Science & Tech',
    name: 'Science & Technology',
    description: 'AI, Space, Biotechnology, Defense, IT, Cybersecurity',
    color: 'text-cyan-700',
    bgLight: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800',
    borderColor: 'border-cyan-200',
    iconName: 'Cpu'
  },
  {
    id: 'History',
    name: 'History & Culture',
    description: 'Ancient, Medieval, Modern India, Art & Architecture',
    color: 'text-orange-700',
    bgLight: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
    borderColor: 'border-orange-200',
    iconName: 'BookOpen'
  }
];
