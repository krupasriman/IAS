import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pencil, Trash2, Download, Globe, FileText, Clock, ArrowLeft,
  Quote, CheckCircle2, TrendingUp, Flag, Lightbulb, AlertTriangle,
  Bookmark, BookmarkPlus, X
} from 'lucide-react';
import type { Topic } from '../types/topic.types';
import { getCategoryInfo } from '../utils/categoryHelpers';
import { validateTopic } from '../utils/validator';

interface TopicDetailProps {
  topic: Topic;
  onDelete?: (id: string) => void;
}

export default function TopicDetail({ topic, onDelete }: TopicDetailProps) {
  const navigate = useNavigate();
  const categoryInfo = getCategoryInfo(topic.category);
  const Icon = categoryInfo.icon;
  const validation = validateTopic(topic);
  const [showValidation, setShowValidation] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`Delete "${topic.title}"? This cannot be undone.`)) {
      onDelete?.(topic.id);
      navigate('/');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(topic, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{topic.title}</span>
      </div>

      {/* Header Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mb-6 overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryInfo.gradient}`} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${categoryInfo.bgLight}`}>
                <Icon className="w-4 h-4" />
                {topic.category}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                topic.source === 'web' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {topic.source === 'web' ? <Globe className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {topic.source === 'web' ? 'From Web Search' : 'From Local Notes'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">{topic.title}</h1>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Updated {formatDate(topic.updatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {topic.pros?.length ?? 0} Pros
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {topic.cons?.length ?? 0} Cons
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowValidation(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                validation.isValid
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              }`}
              title="Check format validation"
            >
              <CheckCircle2 className="w-4 h-4" />
              {validation.score}%
            </button>
            <button
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              {saved ? <Bookmark className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              {saved ? 'Saved' : 'Bookmark'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <Link
              to={`/edit/${topic.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Validation panel */}
        {showValidation && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${validation.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">
                {validation.isValid ? '✓ Format looks good' : '⚠ Format improvements suggested'}
              </span>
              <button onClick={() => setShowValidation(false)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
            </div>
            {validation.warnings.length > 0 ? (
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            ) : (
              <p>Word counts: Meaning {validation.wordCounts.meaning}, Quote {validation.wordCounts.quote}, Way Forward {validation.wordCounts.wayForward}, Conclusion {validation.wordCounts.conclusion}</p>
            )}
          </div>
        )}
      </div>

      {/* Meaning Section */}
      <Section title="Meaning" icon={Lightbulb} accent="blue">
        <p className="text-slate-700 leading-relaxed">{topic.meaning}</p>
      </Section>

      {/* Quote Section */}
      <Section title="Quote" icon={Quote} accent="purple">
        <div className="relative bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
          <Quote className="absolute top-3 left-3 w-8 h-8 text-purple-200" />
          <p className="text-lg text-purple-900 font-medium italic pl-6 leading-relaxed">
            "{topic.quote.text}"
          </p>
          <p className="text-sm text-purple-600 font-semibold mt-3 pl-6">— {topic.quote.source}</p>
        </div>
      </Section>

      {/* Pros & Cons */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pros */}
        <Section title="Pros" icon={TrendingUp} accent="emerald">
          <div className="space-y-3">
            {topic.pros?.map((pro, i) => (
              <div key={i} className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-emerald-800 text-sm">{pro.title}</h4>
                    <p className="text-slate-600 text-sm mt-1">{pro.explanation}</p>
                    {pro.example && (
                      <div className="mt-2 text-xs bg-white rounded-lg p-2.5 border border-emerald-100">
                        <span className="font-semibold text-emerald-600">Example: </span>
                        <span className="text-slate-600">{pro.example}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!topic.pros || topic.pros.length === 0) && (
              <p className="text-sm text-slate-400 italic">No pros available.</p>
            )}
          </div>
        </Section>

        {/* Cons */}
        <Section title="Cons" icon={AlertTriangle} accent="red">
          <div className="space-y-3">
            {topic.cons?.map((con, i) => (
              <div key={i} className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-red-800 text-sm">{con.title}</h4>
                    <p className="text-slate-600 text-sm mt-1">{con.explanation}</p>
                    {con.example && (
                      <div className="mt-2 text-xs bg-white rounded-lg p-2.5 border border-red-100">
                        <span className="font-semibold text-red-600">Example: </span>
                        <span className="text-slate-600">{con.example}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!topic.cons || topic.cons.length === 0) && (
              <p className="text-sm text-slate-400 italic">No cons available.</p>
            )}
          </div>
        </Section>
      </div>

      {/* Way Forward */}
      <Section title="Way Forward" icon={Flag} accent="indigo">
        <p className="text-slate-700 leading-relaxed">{topic.wayForward}</p>
      </Section>

      {/* Conclusion */}
      <Section title="Conclusion" icon={CheckCircle2} accent="amber">
        {typeof topic.conclusion === 'string' ? (
          <p className="text-slate-700 leading-relaxed">{topic.conclusion}</p>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <p className="text-slate-700 leading-relaxed">{topic.conclusion.negative}</p>
            <p className="text-slate-800 font-medium leading-relaxed mt-2">{topic.conclusion.positive}</p>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title, icon: Icon, accent, children
}: {
  title: string;
  icon: any;
  accent: 'blue' | 'purple' | 'emerald' | 'red' | 'indigo' | 'amber';
  children: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}