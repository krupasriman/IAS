import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebSearchResponse } from "../../types/search.types";
import type { SearchSettings } from "../../types/settings.types";
import { parseDuckDuckGoResults, webSearch } from "./index";

const DDG_FIXTURE = `<div id="links" class="results">

  <div class="result results_links results_links_deep web-result ">
    <div class="links_main links_deep result__body">
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.careerindia.com%2Fupsc%2Fias%2Dexam%2De1.html&rut=x">IAS Exam, Eligibility for IAS, Age Limit, Syllabus &amp; Preparation</a>
      </h2>
      <div class="result__extras">
        <span class="result__url">www.careerindia.com/upsc/ias-exam-e1.html</span>
      </div>
      <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">Check how to prepare for IAS Exam and get latest updates on syllabus, eligibility, application form, admit card, question papers, results.</a>
      <div class="clear"></div>
    </div>
  </div>

  <div class="result results_links results_links_deep web-result ">
    <div class="links_main links_deep result__body">
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FIndian_Administrative_Service&rut=y">Indian Administrative Service - Wikipedia</a>
      </h2>
      <a class="result__snippet" href="//duckduckgo.com/l/?uddg=y">The Indian Administrative Service (IAS) is the premier administrative arm of the All India Services of Government of India.</a>
      <div class="clear"></div>
    </div>
  </div>
</div>`;

describe("parseDuckDuckGoResults", () => {
	it("parses DuckDuckGo HTML results and decodes uddg URLs", () => {
		const results = parseDuckDuckGoResults(DDG_FIXTURE, 8);

		expect(results).toHaveLength(2);

		expect(results[0]?.title).toBe(
			"IAS Exam, Eligibility for IAS, Age Limit, Syllabus & Preparation",
		);
		expect(results[0]?.url).toBe(
			"https://www.careerindia.com/upsc/ias-exam-e1.html",
		);
		expect(results[0]?.snippet).toContain("Check how to prepare for IAS Exam");
		expect(results[0]?.snippet).not.toContain("&amp;");

		expect(results[1]?.title).toBe("Indian Administrative Service - Wikipedia");
		expect(results[1]?.url).toBe(
			"https://en.wikipedia.org/wiki/Indian_Administrative_Service",
		);
	});

	it("returns no results when DuckDuckGo serves a non-results page", () => {
		expect(parseDuckDuckGoResults("<div>no results here</div>", 8)).toEqual([]);
	});

	it("does not split on nested result__body divs", () => {
		const html = `<div class="result results_links_deep web-result "><div class="links_main links_deep result__body"><h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fias">IAS</a></h2></div></div>`;
		const results = parseDuckDuckGoResults(html, 8);
		expect(results).toHaveLength(1);
		expect(results[0]?.url).toBe("https://example.com/ias");
	});
});

const baseSettings: SearchSettings = {
	provider: "duckduckgo",
	apiKeys: {
		duckduckgo: "",
		serpapi: "",
		brave: "",
		tavily: "",
		langsearch: "",
	},
	maxResults: 8,
};

function ddgOkResponse(html: string) {
	return Promise.resolve({
		ok: true,
		status: 200,
		text: () => Promise.resolve(html),
	});
}

function wikiResponse() {
	return Promise.resolve({
		ok: true,
		status: 200,
		json: () =>
			Promise.resolve({
				query: {
					search: [
						{ title: "Indian Administrative Service", snippet: "IAS is ..." },
					],
				},
			}),
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("webSearch fallback chain", () => {
	it("returns DuckDuckGo results when parsing succeeds and does not warn", async () => {
		const fetchMock = vi.fn();
		fetchMock.mockImplementation(async (input: unknown) => {
			if (String(input).includes("/api/search/duckduckgo")) {
				return ddgOkResponse(DDG_FIXTURE);
			}
			return wikiResponse();
		});
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await webSearch("indian administrative service exam", {
			...baseSettings,
		});

		expect(result.results).toHaveLength(2);
		expect(result.provider).toBe("duckduckgo");
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("falls back to Wikipedia when DDG returns no results", async () => {
		const fetchMock = vi.fn();
		fetchMock.mockImplementation(async (input: unknown) => {
			if (String(input).includes("/api/search/duckduckgo")) {
				return ddgOkResponse("<div>no results here</div>");
			}
			return wikiResponse();
		});
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await webSearch("indian administrative service exam", {
			...baseSettings,
		});

		expect(result.provider).toBe("wikipedia");
		expect(result.results).toHaveLength(1);
		expect(result.results[0]?.title).toBe("Indian Administrative Service");
		// A single provider failing is expected/quiet; only warn when ALL fail.
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("warns once and returns empty results when every provider fails", async () => {
		const fetchMock = vi.fn();
		fetchMock.mockRejectedValue(new Error("network down"));
		vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await webSearch("indian administrative service exam", {
			...baseSettings,
		});

		expect(result.results).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.[0]).toBe(
			"All web search providers failed, proceeding without web context:",
		);
	});
});

describe("webSearch return shape", () => {
	it("always returns a WebSearchResponse, even when offline", async () => {
		vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result: WebSearchResponse = await webSearch("test query", {
			...baseSettings,
		});

		expect(result.results).toEqual([]);
		expect(result.query).toBe("test query");
		expect(result.timestamp).toBeDefined();
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
	});
});
