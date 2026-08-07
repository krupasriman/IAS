import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, X } from 'lucide-react';
import type { Topic, CategoryType, ProConItem } from '../types/topic.types';
import { CATEGORIES } from '../data/categories';

interface TopicFormProps {
  initialTopic?: Topic;
  onSave: (topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Topic, 'id'>>) => void;
  isEditing?: boolean;
}

const EMPTY_ITEM: ProConItem = { title: '', explanation: '', example: '' };

export default function TopicForm({ initialTopic, onSave, isEditing = false }: TopicFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTopic?.title ?? '');
  const [category, setCategory] = useState<CategoryType>(initialTopic?.category ?? 'Polity');
  const [meaning, setMeaning] = useState(initialTopic?.meaning ?? '');
  const [quoteText, setQuoteText] = useState(initialTopic?.quote?.text ?? '');
  const [quoteSource, setQuoteSource] = useState(initialTopic?.quote?.source ?? '');
  const [wayForward, setWayForward] = useState(initialTopic?.wayForward ?? '');
  const [conclusionNegative, setConclusionNegative] = useState(
    typeof initialTopic?.conclusion === 'object' ? initialTopic.conclusion.negative : ''
  );
  const [conclusionPositive, setConclusionPositive] = useState(
    typeof initialTopic?.conclusion === 'object' ? initialTopic.conclusion.positive : ''
  );
  const [pros, setPros] = useState<ProConItem[]>(
    initialTopic?.pros && initialTopic.pros.length > 0
      ? initialTopic.pros
      : [EMPTY_ITEM, EMPTY_ITEM, EMPTY_ITEM, EMPTY_ITEM]
  );
  const [cons, setCons] = useState<ProConItem[]>(
    initialTopic?.cons && initialTopic.cons.length > 0
      ? initialTopic.cons
      : [EMPTY_ITEM, EMPTY_ITEM, EMPTY_ITEM, EMPTY_ITEM]
  );
  const [tags, setTags] = useState(initialTopic?.tags?.join(', ') ?? '');
  const [error, setError] = useState('');

  const updateItem = (
    list: ProConItem[],
    setList: (items: ProConItem[]) => void,
    index: number,
    field: keyof ProConItem,
    value: string
  ) => {
    const next = list.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    setList(next);
  };

  const addItem = (setList: (items: ProConItem[]) => void, list: ProConItem[]) => {
    setList([...list, { ...EMPTY_ITEM }]);
  };

  const removeItem = (list: ProConItem[], setList: (items: ProConItem[]) => void, index: number) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index));
    }
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Title is required.');
    if (!meaning.trim()) errors.push('Meaning is required.');
    if (!quoteText.trim()) errors.push('Quote text is required.');
    if (!wayForward.trim()) errors.push('Way Forward is required.');
    if (!conclusionNegative.trim() || !conclusionPositive.trim()) {
      errors.push('Both conclusion lines are required.');
    }
    if (pros.some(p => !p.title.trim() || !p.explanation.trim())) {
      errors.push('Every Pro needs a title and explanation.');
    }
    if (cons.some(c => !c.title.trim() || !c.explanation.trim())) {
      errors.push('Every Con needs a title and explanation.');
    }
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }
    setError('');

    const topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Topic, 'id'>> = {
      id: initialTopic?.id,
      title: title.trim(),
      category,
      meaning: meaning.trim(),
      quote: {
        text: quoteText.trim(),
        source: quoteSource.trim() || 'UPSC Reference'
      },
      pros: pros.filter(p => p.title.trim()).map(p => ({
        title: p.title.trim(),
        explanation: p.explanation.trim(),
        example: p.example.trim()
      })),
      cons: cons.filter(c => c.title.trim()).map(c => ({
        title: c.title.trim(),
        explanation: c.explanation.trim(),
        example: c.example.trim()
      })),
      wayForward: wayForward.trim(),
      conclusion: {
        negative: conclusionNegative.trim(),
        positive: conclusionPositive.trim()
      },
      source: initialTopic?.source ?? 'local',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    onSave(topicData);
    navigate('/');
  };

  const inputClass = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all bg-white";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const sectionClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6";

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditing ? 'Edit Topic' : 'Add New Topic'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className={sectionClass}>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Topic Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Honour Killing"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className={inputClass}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className={labelClass}>Meaning (25-30 words) *</label>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              rows={3}
              placeholder="Define the core concept precisely..."
              className={inputClass}
            />
            <p className={`text-xs mt-1 ${meaning.split(/\s+/).filter(Boolean).length >= 25 && meaning.split(/\s+/).filter(Boolean).length <= 30 ? 'text-emerald-600' : 'text-slate-400'}`}>
              Word count: {meaning.split(/\s+/).filter(Boolean).length} / 25-30 words
            </p>
          </div>
          <div>
            <label className={labelClass}>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Caste, Gender, Article 21"
              className={inputClass}
            />
          </div>
        </div>

        {/* Quote */}
        <div className={sectionClass}>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quote (max 20 words)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quote Text *</label>
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                rows={2}
                placeholder='"Honour killings are nothing but barbaric acts..."'
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Source *</label>
              <input
                type="text"
                value={quoteSource}
                onChange={(e) => setQuoteSource(e.target.value)}
                placeholder="e.g. Supreme Court of India"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Pros */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Pros (4 recommended)</h2>
            <button
              type="button"
              onClick={() => addItem(setPros, pros)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100"
            >
              <Plus className="w-4 h-4" /> Add Pro
            </button>
          </div>
          <div className="space-y-4">
            {pros.map((pro, i) => (
              <div key={i} className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-emerald-700">Pro {i + 1}</span>
                  {pros.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(pros, setPros, i)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={pro.title}
                    onChange={(e) => updateItem(pros, setPros, i, 'title', e.target.value)}
                    placeholder="Title (e.g. Financial Savings)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={pro.example}
                    onChange={(e) => updateItem(pros, setPros, i, 'example', e.target.value)}
                    placeholder="Example (recent, max 20 words)"
                    className={inputClass}
                  />
                  <textarea
                    value={pro.explanation}
                    onChange={(e) => updateItem(pros, setPros, i, 'explanation', e.target.value)}
                    rows={2}
                    placeholder="Explanation (max 25 words)"
                    className={`${inputClass} sm:col-span-2`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cons */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Cons (4 recommended)</h2>
            <button
              type="button"
              onClick={() => addItem(setCons, cons)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100"
            >
              <Plus className="w-4 h-4" /> Add Con
            </button>
          </div>
          <div className="space-y-4">
            {cons.map((con, i) => (
              <div key={i} className="bg-red-50/40 rounded-xl p-4 border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-red-700">Con {i + 1}</span>
                  {cons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(cons, setCons, i)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={con.title}
                    onChange={(e) => updateItem(cons, setCons, i, 'title', e.target.value)}
                    placeholder="Title (e.g. Religious Concerns)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={con.example}
                    onChange={(e) => updateItem(cons, setCons, i, 'example', e.target.value)}
                    placeholder="Example (recent, max 20 words)"
                    className={inputClass}
                  />
                  <textarea
                    value={con.explanation}
                    onChange={(e) => updateItem(cons, setCons, i, 'explanation', e.target.value)}
                    rows={2}
                    placeholder="Explanation (max 25 words)"
                    className={`${inputClass} sm:col-span-2`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Way Forward */}
        <div className={sectionClass}>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Way Forward (50-60 words)</h2>
          <textarea
            value={wayForward}
            onChange={(e) => setWayForward(e.target.value)}
            rows={4}
            placeholder="Suggest actionable steps backed by specific reports/schemes/laws..."
            className={inputClass}
          />
          <p className={`text-xs mt-1 ${wayForward.split(/\s+/).filter(Boolean).length >= 50 && wayForward.split(/\s+/).filter(Boolean).length <= 60 ? 'text-emerald-600' : 'text-slate-400'}`}>
            Word count: {wayForward.split(/\s+/).filter(Boolean).length} / 50-60 words
          </p>
        </div>

        {/* Conclusion */}
        <div className={sectionClass}>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Conclusion (2 lines, 20-25 words total)</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Line 1 - Negative/Challenging aspect</label>
              <textarea
                value={conclusionNegative}
                onChange={(e) => setConclusionNegative(e.target.value)}
                rows={2}
                placeholder="e.g. Deep-rooted caste prejudices fuel these brutal murders..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Line 2 - Pivot + Positive note (But/While/However)</label>
              <textarea
                value={conclusionPositive}
                onChange={(e) => setConclusionPositive(e.target.value)}
                rows={2}
                placeholder="e.g. However, proactive judicial interventions are slowly dismantling these structures."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 mb-12">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md transition-colors"
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Save Changes' : 'Save Topic'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}