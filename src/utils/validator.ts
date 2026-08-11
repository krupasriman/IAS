import type { Topic, ValidationReport } from "../types/topic.types";

export function wordCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateTopic(topic: Topic): ValidationReport {
	const warnings: string[] = [];
	let score = 100;
	const wordCounts = {
		meaning: wordCount(topic.meaning),
		quote: wordCount(topic.quote.text),
		wayForward: wordCount(
			Array.isArray(topic.wayForward)
				? topic.wayForward.join(" ")
				: topic.wayForward,
		),
		conclusion: 0,
	};

	// Meaning 25-30 words
	if (topic.meaning) {
		if (wordCounts.meaning < 25 || wordCounts.meaning > 30) {
			warnings.push(`Meaning has ${wordCounts.meaning} words (target 25-30)`);
			score -= 10;
		}
	}

	// Quote max 20 words
	if (wordCounts.quote > 20) {
		warnings.push(`Quote has ${wordCounts.quote} words (max 20)`);
		score -= 10;
	}

	// Exactly 4 pros & 4 cons
	const prosCount = topic.pros?.length ?? 0;
	const consCount = topic.cons?.length ?? 0;
	if (prosCount !== 4) {
		warnings.push(`${prosCount} pros found (expected 4)`);
		score -= 15;
	}
	if (consCount !== 4) {
		warnings.push(`${consCount} cons found (expected 4)`);
		score -= 15;
	}

	// Each pro/con explanation max 25 words, example max 20 words
	[...(topic.pros ?? []), ...(topic.cons ?? [])].forEach((item, i) => {
		if (!item) return;
		const exp = wordCount(item.explanation || "");
		if (exp > 25) {
			warnings.push(`Item ${i + 1} explanation has ${exp} words (max 25)`);
			score -= 2;
		}
		const ex = wordCount(item.example || "");
		if (ex > 20) {
			warnings.push(`Item ${i + 1} example has ${ex} words (max 20)`);
			score -= 2;
		}
	});

	// Way Forward
	if (topic.wayForward) {
		if (wordCounts.wayForward < 50 || wordCounts.wayForward > 60) {
			warnings.push(
				`Way Forward has ${wordCounts.wayForward} words (target 50-60)`,
			);
			score -= 10;
		}
	}

	// Conclusion (2 lines, 20-25 words total)
	if (typeof topic.conclusion === "string") {
		wordCounts.conclusion = wordCount(topic.conclusion);
		const lines = topic.conclusion.split("\n").filter((l) => l.trim()).length;
		if (lines !== 2) {
			warnings.push(`Conclusion has ${lines} lines (expected 2)`);
			score -= 10;
		}
	} else {
		const neg = topic.conclusion?.negative || "";
		const pos = topic.conclusion?.positive || "";
		wordCounts.conclusion = wordCount(neg) + wordCount(pos);
		if (wordCounts.conclusion < 20 || wordCounts.conclusion > 25) {
			warnings.push(
				`Conclusion has ${wordCounts.conclusion} words (target 20-25)`,
			);
			score -= 10;
		}
	}

	score = Math.max(0, score);

	return {
		isValid: score >= 85,
		score,
		warnings,
		wordCounts,
	};
}
