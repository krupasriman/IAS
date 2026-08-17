import type { Topic } from "../types/topic.types";

/**
 * Normalizes text to clean, clear plain text by removing:
 * - Markdown tokens (**, *, #, >, `, __, etc.)
 * - Non-breaking hyphens, em-dashes, and special dash characters
 * - Curly / smart quotes
 * - Non-breaking spaces and zero-width characters
 */
export function cleanText(str?: string | null): string {
	if (!str) return "";
	return (
		str
			// Strip inline code backticks first
			.replace(/`([^`]+)`/g, "$1")
			// Strip markdown bold / italic formatting
			.replace(/\*\*(.*?)\*\*/g, "$1")
			.replace(/\*(.*?)\*/g, "$1")
			.replace(/__(.*?)__/g, "$1")
			.replace(/_(.*?)_/g, "$1")
			// Strip markdown headers and blockquotes
			.replace(/^#{1,6}\s+/gm, "")
			.replace(/^>\s+/gm, "")
			// Replace non-breaking / special unicode hyphens and dashes with standard '-'
			.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE63\uFF0D]/g, "-")
			// Replace curly single quotes with standard "'"
			.replace(/[\u2018\u2019\u201A\u201B\u00B4]/g, "'")
			// Replace curly double quotes and guillemets with standard '"'
			.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
			// Replace non-breaking spaces, thin spaces, and zero-width spaces with standard ' '
			.replace(/[\u00A0\u2007\u202F\u200B\uFEFF]/g, " ")
			// Normalize excess internal spaces within words while preserving clean spacing
			.replace(/[ \t]+/g, " ")
			.trim()
	);
}

/**
 * Formats a topic into crystal-clear plain text without any markdown or unwanted characters.
 */
export function formatFullTopicPlainText(topic: Topic): string {
	const lines: string[] = [];

	// Title & Metadata
	lines.push(cleanText(topic.title).toUpperCase());
	lines.push(`Category: ${cleanText(topic.category)}`);
	lines.push("==================================================");
	lines.push("");

	// 1. Meaning & Context
	lines.push("1. MEANING & CONTEXT");
	lines.push(cleanText(topic.meaning));
	lines.push("");

	// 2. Notable Quote
	if (topic.quote?.text) {
		lines.push("2. NOTABLE QUOTE");
		lines.push(`"${cleanText(topic.quote.text)}"`);
		lines.push(`- ${cleanText(topic.quote.source)}`);
		lines.push("");
	}

	// 3. Key Advantages & Arguments
	if (topic.pros && topic.pros.length > 0) {
		lines.push("3. KEY ADVANTAGES & ARGUMENTS");
		for (const [i, pro] of topic.pros.entries()) {
			lines.push(`3.${i + 1} ${cleanText(pro.title)}`);
			lines.push(cleanText(pro.explanation));
			if (pro.example) {
				lines.push(`Example: ${cleanText(pro.example)}`);
			}
			lines.push("");
		}
	}

	// 4. Challenges & Concerns
	if (topic.cons && topic.cons.length > 0) {
		lines.push("4. CHALLENGES & CONCERNS");
		for (const [i, con] of topic.cons.entries()) {
			lines.push(`4.${i + 1} ${cleanText(con.title)}`);
			lines.push(cleanText(con.explanation));
			if (con.example) {
				lines.push(`Example: ${cleanText(con.example)}`);
			}
			lines.push("");
		}
	}

	// 5. Way Forward & Policy Reforms
	if (topic.wayForward) {
		lines.push("5. WAY FORWARD & POLICY REFORMS");
		if (Array.isArray(topic.wayForward)) {
			for (const [i, step] of topic.wayForward.entries()) {
				lines.push(`${i + 1}. ${cleanText(step)}`);
			}
		} else {
			lines.push(`1. ${cleanText(topic.wayForward)}`);
		}
		lines.push("");
	}

	// 6. Balanced Mains Conclusion
	if (topic.conclusion) {
		lines.push("6. BALANCED MAINS CONCLUSION");
		if (typeof topic.conclusion === "string") {
			lines.push(cleanText(topic.conclusion));
		} else {
			lines.push(cleanText(topic.conclusion.negative));
			lines.push(cleanText(topic.conclusion.positive));
		}
		lines.push("");
	}

	return lines.join("\n").trim();
}
