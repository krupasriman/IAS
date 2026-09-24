import { describe, expect, it } from "vitest";
import {
	formatDomainToWebsiteName,
	getDisplaySourceName,
	getFaviconUrl,
	getHostname,
	unwrapUrl,
} from "./sourceHelpers";

describe("sourceHelpers", () => {
	describe("unwrapUrl", () => {
		it("unwraps DuckDuckGo redirect uddg parameter", () => {
			const ddgUrl =
				"//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FEducation_in_India&rut=test";
			expect(unwrapUrl(ddgUrl)).toBe(
				"https://en.wikipedia.org/wiki/Education_in_India",
			);
		});

		it("unwraps https DuckDuckGo redirect URL", () => {
			const ddgUrl =
				"https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.thehindu.com%2Fnews%2Fnational%2Farticle.ece";
			expect(unwrapUrl(ddgUrl)).toBe(
				"https://www.thehindu.com/news/national/article.ece",
			);
		});

		it("returns normal URLs untouched", () => {
			expect(
				unwrapUrl("https://pib.gov.in/PressReleasePage.aspx?PRID=123"),
			).toBe("https://pib.gov.in/PressReleasePage.aspx?PRID=123");
		});
	});

	describe("getHostname", () => {
		it("extracts clean hostname from unwrapped URLs", () => {
			expect(
				getHostname(
					"https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.thehindu.com%2Fnews",
				),
			).toBe("thehindu.com");
			expect(getHostname("https://en.wikipedia.org/wiki/Test")).toBe(
				"en.wikipedia.org",
			);
			expect(getHostname("https://pib.gov.in/press")).toBe("pib.gov.in");
		});
	});

	describe("formatDomainToWebsiteName", () => {
		it("formats known authoritative news and education domains", () => {
			expect(formatDomainToWebsiteName("en.wikipedia.org")).toBe("Wikipedia");
			expect(formatDomainToWebsiteName("thehindu.com")).toBe("The Hindu");
			expect(formatDomainToWebsiteName("indianexpress.com")).toBe(
				"The Indian Express",
			);
			expect(formatDomainToWebsiteName("pib.gov.in")).toBe("PIB India");
			expect(formatDomainToWebsiteName("ncert.nic.in")).toBe("NCERT");
			expect(formatDomainToWebsiteName("drishtiias.com")).toBe("Drishti IAS");
			expect(formatDomainToWebsiteName("prsindia.org")).toBe(
				"PRS Legislative Research",
			);
		});

		it("formats generic and institutional domains cleanly", () => {
			expect(formatDomainToWebsiteName("khanacademy.org")).toBe("Khan Academy");
			expect(formatDomainToWebsiteName("down-to-earth.org")).toBe(
				"Down To Earth",
			);
		});
	});

	describe("getDisplaySourceName", () => {
		it("ignores search engine names and resolves the actual website name from URL", () => {
			const item = {
				title: "Education in India - Wikipedia",
				url: "https://duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FEducation_in_India",
				snippet: "Overview of education in India.",
				source: "DuckDuckGo",
			};
			expect(getDisplaySourceName(item)).toBe("Wikipedia");
		});

		it("resolves website name when source is Tavily or Brave", () => {
			const item = {
				title: "NEP 2020 Reforms - The Hindu",
				url: "https://www.thehindu.com/education/nep-reforms",
				snippet: "National Education Policy analysis.",
				source: "Tavily",
			};
			expect(getDisplaySourceName(item)).toBe("The Hindu");
		});

		it("resolves Indian government portals accurately", () => {
			const item = {
				title: "Ministry of Education Releases New Guidelines",
				url: "https://education.gov.in/guidelines",
				snippet: "Official guidelines.",
			};
			expect(getDisplaySourceName(item)).toBe("Ministry of Education");
		});

		it("preserves genuine publisher source labels if already set", () => {
			const item = {
				title: "Constitution Bench Ruling",
				url: "https://main.sci.gov.in/judgments",
				snippet: "Judicial verdict.",
				source: "Supreme Court of India",
			};
			expect(getDisplaySourceName(item)).toBe("Supreme Court of India");
		});
	});

	describe("getFaviconUrl", () => {
		it("does not return a favicon URL for DuckDuckGo", () => {
			expect(getFaviconUrl("https://duckduckgo.com/search")).toBe("");
		});

		it("returns Google favicon service URL for target website", () => {
			expect(getFaviconUrl("https://thehindu.com")).toBe(
				"https://www.google.com/s2/favicons?domain=thehindu.com&sz=32",
			);
		});
	});
});
