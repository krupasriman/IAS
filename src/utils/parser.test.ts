import { describe, expect, it } from "vitest";
import { parseMarkdownToTopicAsync } from "./parseMarkdown";
import { parseMarkdownToTopic } from "./parser";

const SAMPLE_OUTPUT = `Meaning
Judicial review is the power of courts to examine the constitutionality of legislative and executive actions. It serves as a cornerstone of constitutional democracy.

Quote
"The Constitution is the supreme law of the land." - Dr. B.R. Ambedkar

Pros & Cons
Pros:

1. Protection of Rights: Courts can strike down unconstitutional laws.
Example: Kesavananda Bharati case established the basic structure doctrine.

2. Checks Executive Power: Prevents arbitrary administrative action.
Example: ADM Jabalpur case highlighted judicial oversight.

3. Upholds Federalism: Resolves centre-state disputes.
Example: S.R. Bommai case strengthened federal structure.

4. Judicial Review Enforces Rule of Law: Ensures accountability.
Example: Maneka Gandhi case expanded personal liberty.

Cons:

1. Judicial Overreach: Courts may encroach on legislative functions.
Example: Policy decisions questioned in several landmark rulings.

2. Delays in Justice: Long pendency of cases hampers redress.
Example: Millions of cases pending in Indian courts.

3. Expensive Litigation: Access to justice remains limited.
Example: Legal costs deter poor litigants.

4. Lack of Accountability: Judges are not easily removable.
Example: Impeachment process has never been successfully used.

Way Forward
The government should implement the National Litigation Policy, establish specialized benches, and adopt alternative dispute resolution mechanisms to reduce pendency and improve access to justice for citizens.

Conclusion
Judicial overreach and case pendency remain persistent challenges.
However, judicial review remains the bedrock of Indian constitutional democracy.`;

describe("parseMarkdownToTopic", () => {
	it("parses all five sections from a full LLM response", () => {
		const topic = parseMarkdownToTopic(
			SAMPLE_OUTPUT,
			"Judicial Review",
			"Polity",
		);

		expect(topic.title).toBe("Judicial Review");
		expect(topic.category).toBe("Polity");
		expect(topic.meaning).toContain("Judicial review is the power of courts");
		expect(topic.quote?.text).toBe(
			"The Constitution is the supreme law of the land.",
		);
		expect(topic.quote?.source).toBe("Dr. B.R. Ambedkar");
		expect(topic.pros).toHaveLength(4);
		expect(topic.cons).toHaveLength(4);
		expect(topic.wayForward?.[0]).toContain("National Litigation Policy");
		expect(topic.conclusion).toEqual({
			negative:
				"Judicial overreach and case pendency remain persistent challenges.",
			positive:
				"However, judicial review remains the bedrock of Indian constitutional democracy.",
		});
	});

	it("parses quoted items and their examples", () => {
		const topic = parseMarkdownToTopic(
			SAMPLE_OUTPUT,
			"Judicial Review",
			"Polity",
		);

		expect(topic.pros?.[0]).toEqual({
			title: "Protection of Rights",
			explanation: "Courts can strike down unconstitutional laws.",
			example:
				"Kesavananda Bharati case established the basic structure doctrine.",
		});
	});

	it("dedupes cons that mirror pro titles", () => {
		const text = `Meaning
Some meaning text.

Quote
"Some quote" - Author

Pros & Cons
Pros:

1. Checks Executive Power: Prevents arbitrary action.
Example: Example one.

2. Ensures Accountability: Courts keep officials in check.
Example: Example two.

Cons:

1. Checks Executive Power: Duplicate of a pro title.
Example: Duplicate example.

2. Delays in Justice: Cases take too long.
Example: Example three.`;

		const topic = parseMarkdownToTopic(text, "Test Topic", "Polity");

		const consTitles = topic.cons?.map((c) => c.title.toLowerCase());
		expect(consTitles).not.toContain("checks executive power");
		expect(consTitles).toContain("delays in justice");
	});

	it("applies default fallbacks when sections are missing", () => {
		const topic = parseMarkdownToTopic(
			"Meaning\nSome text here.",
			"Minimal Topic",
			"Economy",
		);

		expect(topic.meaning).toBe("Some text here.");
		expect(topic.quote?.text).toBeTruthy();
		expect(topic.quote?.source).toBeTruthy();
		expect(topic.pros).toEqual([]);
		expect(topic.cons).toEqual([]);
		expect(topic.wayForward).toBeTruthy();
		expect(typeof topic.conclusion).toBe("string");
	});

	it("handles asterisk-marked section headers", () => {
		const text = `**Meaning**
Bold-styled meaning definition here.
**Quote**
"Quote text" - Source
**Pros**
1. First Point: Explanation.
Example: Example.
**Cons**
1. Second Point: Explanation.
Example: Example.
**Way Forward**
Some path forward.
**Conclusion**
Negative line.
Positive line.`;

		const topic = parseMarkdownToTopic(text, "Bold Topic", "Governance");

		expect(topic.meaning).toContain("Bold-styled meaning");
		expect(topic.quote?.text).toBe("Quote text");
		expect(topic.pros).toHaveLength(1);
		expect(topic.cons).toHaveLength(1);
		expect(topic.wayForward?.[0]).toContain("Some path forward");
	});

	it("returns ISO timestamps", () => {
		const topic = parseMarkdownToTopic(
			SAMPLE_OUTPUT,
			"Judicial Review",
			"Polity",
		);

		expect(new Date(topic.createdAt ?? "").getTime()).not.toBeNaN();
		expect(new Date(topic.updatedAt ?? "").getTime()).not.toBeNaN();
	});
});

describe("parseMarkdownToTopicAsync", () => {
	it("parses via worker with same result as sync parser", async () => {
		const topic = await parseMarkdownToTopicAsync(
			SAMPLE_OUTPUT,
			"Judicial Review",
			"Polity",
		);

		expect(topic.meaning).toContain("Judicial review is the power");
		expect(topic.pros).toHaveLength(4);
		expect(topic.cons).toHaveLength(4);
		expect(topic.wayForward?.[0]).toContain("National Litigation Policy");
	});
});
