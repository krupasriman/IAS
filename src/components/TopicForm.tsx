import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import {
	type FieldErrors,
	type UseFieldArrayReturn,
	type UseFormRegister,
	useFieldArray,
	useForm,
} from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../data/categories";
import type { CategoryType, ProConItem, Topic } from "../types/topic.types";
import {
	EMPTY_PRO_CON,
	TopicFormSchema,
	type TopicFormValues,
} from "../utils/topicFormSchema";

interface TopicFormProps {
	initialTopic?: Topic;
	onSave: (
		topic: Omit<Topic, "id" | "createdAt" | "updatedAt"> &
			Partial<Pick<Topic, "id">>,
	) => void;
	isEditing?: boolean;
}

function defaultFormValues(initial?: Topic): TopicFormValues {
	const blank = [EMPTY_PRO_CON, EMPTY_PRO_CON, EMPTY_PRO_CON, EMPTY_PRO_CON];
	if (initial) {
		return {
			title: initial.title,
			category: initial.category,
			meaning: initial.meaning,
			quoteText: initial.quote?.text ?? "",
			quoteSource: initial.quote?.source ?? "",
			wayForward: initial.wayForward,
			conclusionNegative:
				typeof initial.conclusion === "object"
					? initial.conclusion.negative
					: "",
			conclusionPositive:
				typeof initial.conclusion === "object"
					? initial.conclusion.positive
					: "",
			pros: initial.pros?.length ? initial.pros : blank,
			cons: initial.cons?.length ? initial.cons : blank,
			tags: initial.tags?.join(", ") ?? "",
		};
	}
	return {
		title: "",
		category: "Polity",
		meaning: "",
		quoteText: "",
		quoteSource: "",
		wayForward: "",
		conclusionNegative: "",
		conclusionPositive: "",
		pros: blank,
		cons: blank,
		tags: "",
	};
}

export default function TopicForm({
	initialTopic,
	onSave,
	isEditing = false,
}: TopicFormProps) {
	const navigate = useNavigate();
	const {
		register,
		control,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<TopicFormValues>({
		resolver: zodResolver(TopicFormSchema),
		defaultValues: defaultFormValues(initialTopic),
		mode: "onBlur",
	});

	const prosArray = useFieldArray({ control, name: "pros" });
	const consArray = useFieldArray({ control, name: "cons" });

	const meaning = watch("meaning") ?? "";
	const wayForward = watch("wayForward") ?? "";

	const meaningWords = meaning.trim().split(/\s+/).filter(Boolean).length;
	const wayForwardWords = wayForward.trim().split(/\s+/).filter(Boolean).length;

	const onSubmit = (values: TopicFormValues) => {
		const cleanPros: ProConItem[] = values.pros
			.filter((p) => p.title.trim())
			.map((p) => ({
				title: p.title.trim(),
				explanation: p.explanation.trim(),
				example: p.example.trim(),
			}));
		const cleanCons: ProConItem[] = values.cons
			.filter((c) => c.title.trim())
			.map((c) => ({
				title: c.title.trim(),
				explanation: c.explanation.trim(),
				example: c.example.trim(),
			}));

		onSave({
			id: initialTopic?.id,
			title: values.title.trim(),
			category: values.category as CategoryType,
			meaning: values.meaning.trim(),
			quote: {
				text: values.quoteText.trim(),
				source: values.quoteSource.trim() || "UPSC Reference",
			},
			pros: cleanPros,
			cons: cleanCons,
			wayForward: values.wayForward.trim(),
			conclusion: {
				negative: values.conclusionNegative.trim(),
				positive: values.conclusionPositive.trim(),
			},
			source: initialTopic?.source ?? "local",
			tags: values.tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean),
		});
		navigate("/");
	};

	return (
		<div className="max-w-4xl mx-auto">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
			>
				<ArrowLeft className="w-4 h-4" /> Back
			</button>

			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-slate-900">
					{isEditing ? "Edit Topic" : "Add New Topic"}
				</h1>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} noValidate>
				<BasicInfoSection
					register={register}
					errors={errors}
					meaningWords={meaningWords}
				/>

				<QuoteSection register={register} errors={errors} />

				<ProConSection
					title="Pros (4 recommended)"
					array={prosArray}
					baseName="pros"
					register={register}
					errors={errors}
				/>

				<ProConSection
					title="Cons (4 recommended)"
					array={consArray}
					baseName="cons"
					register={register}
					errors={errors}
				/>

				<WayForwardSection
					register={register}
					errors={errors}
					wayForwardWords={wayForwardWords}
				/>

				<ConclusionSection register={register} errors={errors} />

				<div className="flex items-center gap-3 mb-12">
					<button
						type="submit"
						className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md transition-colors"
					>
						<Save className="w-5 h-5" />
						{isEditing ? "Save Changes" : "Save Topic"}
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

const inputClass =
	"w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all bg-white";
const errorClass = "border-red-400 focus:ring-red-400/40 focus:border-red-400";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
const sectionClass =
	"bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6";

function BasicInfoSection({
	register,
	errors,
	meaningWords,
}: {
	register: UseFormRegister<TopicFormValues>;
	errors: FieldErrors<TopicFormValues>;
	meaningWords: number;
}) {
	return (
		<div className={sectionClass}>
			<h2 className="text-lg font-bold text-slate-900 mb-4">
				Basic Information
			</h2>
			<div className="grid sm:grid-cols-2 gap-4 mb-4">
				<div>
					<label className={labelClass} htmlFor="topic-title">
						Topic Title *
					</label>
					<input
						type="text"
						id="topic-title"
						{...register("title")}
						placeholder="e.g. Honour Killing"
						className={`${inputClass} ${errors.title ? errorClass : ""}`}
					/>
					{errors.title && (
						<p className="text-xs text-red-600 mt-1">{errors.title.message}</p>
					)}
				</div>
				<div>
					<label className={labelClass} htmlFor="topic-category">
						Category *
					</label>
					<select
						id="topic-category"
						{...register("category")}
						className={inputClass}
					>
						{CATEGORIES.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.name}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="mb-4">
				<label className={labelClass} htmlFor="topic-meaning">
					Meaning (25-30 words) *
				</label>
				<textarea
					id="topic-meaning"
					{...register("meaning")}
					rows={3}
					placeholder="Define the core concept precisely..."
					className={`${inputClass} ${errors.meaning ? errorClass : ""}`}
				/>
				<p
					className={`text-xs mt-1 ${
						meaningWords >= 25 && meaningWords <= 30
							? "text-emerald-600"
							: "text-slate-400"
					}`}
				>
					Word count: {meaningWords} / 25-30 words
				</p>
				{errors.meaning && (
					<p className="text-xs text-red-600 mt-1">{errors.meaning.message}</p>
				)}
			</div>
			<div>
				<label className={labelClass} htmlFor="topic-tags">
					Tags (comma-separated)
				</label>
				<input
					type="text"
					id="topic-tags"
					{...register("tags")}
					placeholder="e.g. Caste, Gender, Article 21"
					className={inputClass}
				/>
			</div>
		</div>
	);
}

function QuoteSection({
	register,
	errors,
}: {
	register: UseFormRegister<TopicFormValues>;
	errors: FieldErrors<TopicFormValues>;
}) {
	return (
		<div className={sectionClass}>
			<h2 className="text-lg font-bold text-slate-900 mb-4">
				Quote (max 20 words)
			</h2>
			<div className="grid sm:grid-cols-2 gap-4">
				<div>
					<label className={labelClass} htmlFor="quote-text">
						Quote Text *
					</label>
					<textarea
						id="quote-text"
						{...register("quoteText")}
						rows={2}
						placeholder='"Honour killings are nothing but barbaric acts..."'
						className={`${inputClass} ${errors.quoteText ? errorClass : ""}`}
					/>
					{errors.quoteText && (
						<p className="text-xs text-red-600 mt-1">
							{errors.quoteText.message}
						</p>
					)}
				</div>
				<div>
					<label className={labelClass} htmlFor="quote-source">
						Source *
					</label>
					<input
						type="text"
						id="quote-source"
						{...register("quoteSource")}
						placeholder="e.g. Supreme Court of India"
						className={inputClass}
					/>
				</div>
			</div>
		</div>
	);
}

type ProConArray = UseFieldArrayReturn<TopicFormValues, "pros" | "cons">;

interface ProConSectionProps {
	title: string;
	array: ProConArray;
	baseName: "pros" | "cons";
	register: UseFormRegister<TopicFormValues>;
	errors: FieldErrors<TopicFormValues>;
}

function ProConSection({
	title,
	array,
	baseName,
	register,
	errors,
}: ProConSectionProps) {
	const { fields, append, remove } = array;
	const isPro = baseName === "pros";
	const accentClasses = isPro
		? {
				addBtn: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
				itemBg: "bg-emerald-50/40 border-emerald-100",
				itemText: "text-emerald-700",
				label: "Pro",
			}
		: {
				addBtn: "bg-red-50 text-red-700 hover:bg-red-100",
				itemBg: "bg-red-50/40 border-red-100",
				itemText: "text-red-700",
				label: "Con",
			};

	const baseErrors = (errors as unknown as Record<string, unknown>)[baseName] as
		| Array<
				FieldErrors<{ title: string; explanation: string; example: string }>
		  >
		| undefined;

	return (
		<div className={sectionClass}>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-bold text-slate-900">{title}</h2>
				<button
					type="button"
					onClick={() => append({ ...EMPTY_PRO_CON })}
					className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${accentClasses.addBtn}`}
				>
					<Plus className="w-4 h-4" /> Add {accentClasses.label}
				</button>
			</div>
			<div className="space-y-4">
				{fields.map((field, i) => {
					const fieldError = baseErrors?.[i];
					return (
						<div
							key={field.id}
							className={`${accentClasses.itemBg} rounded-xl p-4 border`}
						>
							<div className="flex items-center justify-between mb-2">
								<span className={`text-sm font-bold ${accentClasses.itemText}`}>
									{accentClasses.label} {i + 1}
								</span>
								{fields.length > 1 && (
									<button
										type="button"
										onClick={() => remove(i)}
										className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								)}
							</div>
							<div className="grid sm:grid-cols-2 gap-3">
								<input
									type="text"
									{...register(`${baseName}.${i}.title` as const)}
									placeholder="Title (e.g. Financial Savings)"
									className={inputClass}
								/>
								<input
									type="text"
									{...register(`${baseName}.${i}.example` as const)}
									placeholder="Example (recent, max 20 words)"
									className={inputClass}
								/>
								<textarea
									{...register(`${baseName}.${i}.explanation` as const)}
									rows={2}
									placeholder="Explanation (max 25 words)"
									className={`${inputClass} sm:col-span-2`}
								/>
							</div>
							{fieldError && (
								<p className="text-xs text-red-600 mt-2 flex items-center gap-1">
									<X className="w-3 h-3" />
									{fieldError.title?.message ?? fieldError.explanation?.message}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function WayForwardSection({
	register,
	errors,
	wayForwardWords,
}: {
	register: UseFormRegister<TopicFormValues>;
	errors: FieldErrors<TopicFormValues>;
	wayForwardWords: number;
}) {
	return (
		<div className={sectionClass}>
			<h2 className="text-lg font-bold text-slate-900 mb-4">
				Way Forward (50-60 words)
			</h2>
			<textarea
				{...register("wayForward")}
				rows={4}
				placeholder="Suggest actionable steps backed by specific reports/schemes/laws..."
				className={`${inputClass} ${errors.wayForward ? errorClass : ""}`}
			/>
			<p
				className={`text-xs mt-1 ${
					wayForwardWords >= 50 && wayForwardWords <= 60
						? "text-emerald-600"
						: "text-slate-400"
				}`}
			>
				Word count: {wayForwardWords} / 50-60 words
			</p>
			{errors.wayForward && (
				<p className="text-xs text-red-600 mt-1">{errors.wayForward.message}</p>
			)}
		</div>
	);
}

function ConclusionSection({
	register,
	errors,
}: {
	register: UseFormRegister<TopicFormValues>;
	errors: FieldErrors<TopicFormValues>;
}) {
	return (
		<div className={sectionClass}>
			<h2 className="text-lg font-bold text-slate-900 mb-4">
				Conclusion (2 lines, 20-25 words total)
			</h2>
			<div className="space-y-4">
				<div>
					<label className={labelClass} htmlFor="conclusion-negative">
						Line 1 - Negative/Challenging aspect
					</label>
					<textarea
						id="conclusion-negative"
						{...register("conclusionNegative")}
						rows={2}
						placeholder="e.g. Deep-rooted caste prejudices fuel these brutal murders..."
						className={`${inputClass} ${errors.conclusionNegative ? errorClass : ""}`}
					/>
					{errors.conclusionNegative && (
						<p className="text-xs text-red-600 mt-1">
							{errors.conclusionNegative.message}
						</p>
					)}
				</div>
				<div>
					<label className={labelClass} htmlFor="conclusion-positive">
						Line 2 - Pivot + Positive note (But/While/However)
					</label>
					<textarea
						id="conclusion-positive"
						{...register("conclusionPositive")}
						rows={2}
						placeholder="e.g. However, proactive judicial interventions are slowly dismantling these structures."
						className={`${inputClass} ${errors.conclusionPositive ? errorClass : ""}`}
					/>
					{errors.conclusionPositive && (
						<p className="text-xs text-red-600 mt-1">
							{errors.conclusionPositive.message}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
