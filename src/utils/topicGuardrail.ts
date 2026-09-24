/**
 * Topic Guardrail Utility
 * Validates whether an incoming user query is a legitimate academic / UPSC / public policy study topic,
 * or whether it is off-topic chit-chat, a greeting, or a personal question.
 */

export interface TopicValidationResult {
	isRelevant: boolean;
	reason?: string;
}

const OFF_TOPIC_REASON =
	"This generator is designed exclusively for UPSC / IAS syllabus study notes. Please enter a syllabus topic, public policy issue, or current affairs subject (e.g., 'Uniform Civil Code', 'Monetary Policy Committee', 'Electoral Reforms').";

// Exact single-word or short phrase conversational expressions
const CASUAL_GREETINGS = new Set([
	"hi",
	"hello",
	"hey",
	"heyy",
	"heyyy",
	"hiya",
	"howdy",
	"sup",
	"hola",
	"namaste",
	"namaskar",
	"good morning",
	"good afternoon",
	"good evening",
	"good night",
	"bye",
	"goodbye",
	"cya",
	"see you",
	"thanks",
	"thank you",
	"thank u",
	"thx",
	"ok",
	"okay",
	"k",
	"yes",
	"no",
	"cool",
	"nice",
	"wow",
	"lol",
	"haha",
	"hahaha",
	"test",
	"testing",
	"ping",
	"pong",
]);

// Regular expression patterns for off-topic personal, casual chit-chat, and adversarial prompt injections
const OFF_TOPIC_PATTERNS: RegExp[] = [
	// Personal identity questions (about the user or bot)
	/^(what('s|\s+is)\s+my\s+name|who\s+am\s+i|do\s+you\s+know\s+(me|my\s+name)|tell\s+me\s+my\s+name)[\s?!.]*$/i,
	/^(who\s+are\s+you|what('s|\s+is)\s+your\s+name|what\s+are\s+you|are\s+you\s+(an?\s+)?(ai|bot|robot|human|real))[\s?!.]*$/i,
	/^(how\s+old\s+are\s+you|where\s+do\s+you\s+live|where\s+are\s+you\s+from)[\s?!.]*$/i,
	/^(where\s+do\s+i\s+live|how\s+old\s+am\s+i)[\s?!.]*$/i,

	// Casual chit-chat & pleasantries
	/^(how\s+are\s+you(\s+doing)?|how('s|\s+is)\s+it\s+going|what('s|\s+is)\s+up|what\s+are\s+you\s+doing)[\s?!.]*$/i,
	/^(tell\s+me\s+a\s+(joke|story|poem)|sing\s+(me\s+)?a\s+song|can\s+you\s+dance)[\s?!.]*$/i,
	/^(help\s+me(\s+please)?|i\s+need\s+help)[\s?!.]*$/i,

	// Non-substantive conversational commands
	/^(say\s+something|talk\s+to\s+me|reply\s+to\s+me|are\s+you\s+there)[\s?!.]*$/i,

	// Prompt injections & adversarial system overrides
	/\b(ignore\s+(all\s+)?(?:previous|prior)\s+instructions|system\s+prompt|dan\s+mode|jailbreak|disregard\s+(all\s+)?instructions)\b/i,
	/\b(act\s+as\s+(an?\s+)?(unrestricted|linux\s+terminal|hacker|dan)|developer\s+mode\s+output)\b/i,
];

/**
 * Validates whether the user query represents an appropriate UPSC / study topic.
 * Allows all broad analytical subjects, personalities, institutions, and policies.
 * Only restricts empty noise, conversational greetings, bot questions, and prompt injections.
 */
export function validateTopicRelevance(query: string): TopicValidationResult {
	if (!query || typeof query !== "string") {
		return { isRelevant: false, reason: OFF_TOPIC_REASON };
	}

	const cleaned = query
		.trim()
		.toLowerCase()
		.replace(/[?!.,;:]+$/, "")
		.trim();

	// Reject empty or single-character noise
	if (cleaned.length < 2) {
		return {
			isRelevant: false,
			reason: OFF_TOPIC_REASON,
		};
	}

	// Check exact greetings / chit-chat dictionary
	if (CASUAL_GREETINGS.has(cleaned)) {
		return {
			isRelevant: false,
			reason: OFF_TOPIC_REASON,
		};
	}

	// Check regex patterns for personal/casual questions and injections
	for (const pattern of OFF_TOPIC_PATTERNS) {
		if (pattern.test(cleaned)) {
			return {
				isRelevant: false,
				reason: OFF_TOPIC_REASON,
			};
		}
	}

	return { isRelevant: true };
}
