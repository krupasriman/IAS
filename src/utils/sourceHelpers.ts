import type { WebSearchResultItem } from "../types/search.types";

export function unwrapUrl(rawUrl: string): string {
	if (!rawUrl) return "";
	let url = rawUrl.trim();
	if (url.startsWith("//")) {
		url = `https:${url}`;
	}
	// Decode DuckDuckGo redirect (uddg parameter)
	if (url.includes("uddg=")) {
		try {
			const uddgPart = url.split("uddg=")[1];
			const encodedTarget = uddgPart.split("&")[0];
			const decoded = decodeURIComponent(encodedTarget);
			if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
				return decoded;
			}
		} catch {}
	}
	// Decode Google redirect (url?q= parameter)
	if (url.includes("/url?q=")) {
		try {
			const qPart = url.split("/url?q=")[1];
			const encodedTarget = qPart.split("&")[0];
			const decoded = decodeURIComponent(encodedTarget);
			if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
				return decoded;
			}
		} catch {}
	}
	return url;
}

export function getHostname(rawUrl: string): string {
	const url = unwrapUrl(rawUrl);
	try {
		const formatted = /^https?:\/\//i.test(url) ? url : `https://${url}`;
		const parsed = new URL(formatted);
		return parsed.hostname.replace(/^www\./i, "").toLowerCase();
	} catch {
		return url
			.replace(/^https?:\/\//i, "")
			.split("/")[0]
			.replace(/^www\./i, "")
			.toLowerCase();
	}
}

export function getFaviconUrl(url: string): string {
	const domain = getHostname(url);
	if (!domain || domain.includes("duckduckgo.com")) return "";
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

const GOV_NO_FAVICON_DOMAINS = new Set([
	"ncw.nic.in",
	"rbi.org.in",
	"darpg.gov.in",
	"indiabudget.gov.in",
	"sci.gov.in",
	"eci.gov.in",
	"upsc.gov.in",
	"mha.gov.in",
	"mea.gov.in",
	"finmin.nic.in",
	"lawmin.gov.in",
	"ibbi.gov.in",
	"nhrc.nic.in",
	"cag.gov.in",
	"cbic.gov.in",
	"incometaxindia.gov.in",
]);

export function isGovPortalWithoutFavicon(url: string): boolean {
	const domain = getHostname(url).toLowerCase();
	if (GOV_NO_FAVICON_DOMAINS.has(domain)) return true;
	if (domain.endsWith(".nic.in") && domain !== "pib.gov.in") return true;
	return false;
}

const SEARCH_ENGINE_PROVIDERS = new Set([
	"duckduckgo",
	"ddg",
	"tavily",
	"brave",
	"serpapi",
	"google",
	"bing",
	"yahoo",
	"langsearch",
	"search",
	"web",
]);

const KNOWN_WEBSITE_NAMES: Record<string, string> = {
	"wikipedia.org": "Wikipedia",
	"thehindu.com": "The Hindu",
	"indianexpress.com": "The Indian Express",
	"indiatimes.com": "Times of India",
	"timesofindia.indiatimes.com": "Times of India",
	"economictimes.indiatimes.com": "The Economic Times",
	"hindustantimes.com": "Hindustan Times",
	"livemint.com": "Livemint",
	"business-standard.com": "Business Standard",
	"pib.gov.in": "PIB India",
	"niti.gov.in": "NITI Aayog",
	"prsindia.org": "PRS Legislative Research",
	"drishtiias.com": "Drishti IAS",
	"visionias.in": "Vision IAS",
	"insightsonindia.com": "Insights on India",
	"iasbaba.com": "IASbaba",
	"khanacademy.org": "Khan Academy",
	"byjus.com": "BYJU'S",
	"unacademy.com": "Unacademy",
	"vikaspedia.in": "Vikaspedia",
	"ncert.nic.in": "NCERT",
	"cbse.gov.in": "CBSE",
	"ugc.ac.in": "UGC",
	"ugc.gov.in": "UGC",
	"ignou.ac.in": "IGNOU",
	"mea.gov.in": "Ministry of External Affairs",
	"mha.gov.in": "Ministry of Home Affairs",
	"rbi.org.in": "Reserve Bank of India",
	"orfonline.org": "ORF Online",
	"idsa.in": "MP-IDSA",
	"un.org": "United Nations",
	"who.int": "WHO",
	"worldbank.org": "World Bank",
	"weforum.org": "World Economic Forum",
	"imf.org": "IMF",
	"unesco.org": "UNESCO",
	"unicef.org": "UNICEF",
	"britannica.com": "Britannica",
	"bbc.com": "BBC News",
	"bbc.co.uk": "BBC News",
	"reuters.com": "Reuters",
	"aljazeera.com": "Al Jazeera",
	"epw.in": "Economic & Political Weekly",
	"downtoearth.org.in": "Down To Earth",
	"theprint.in": "ThePrint",
	"thewire.in": "The Wire",
	"scroll.in": "Scroll.in",
	"ndtv.com": "NDTV",
	"indiatoday.in": "India Today",
	"firstpost.com": "Firstpost",
	"deccanherald.com": "Deccan Herald",
	"tribuneindia.com": "The Tribune",
	"financialexpress.com": "Financial Express",
	"outlookindia.com": "Outlook India",
	"frontline.thehindu.com": "Frontline",
	"scconline.com": "SCC Online",
	"livelaw.in": "LiveLaw",
	"barandbench.com": "Bar & Bench",
	"clearias.com": "ClearIAS",
	"forumias.com": "ForumIAS",
	"careerindia.com": "CareerIndia",
	"jagranjosh.com": "Jagran Josh",
	"sci.gov.in": "Supreme Court of India",
	"eci.gov.in": "Election Commission of India",
	"upsc.gov.in": "UPSC",
	"education.gov.in": "Ministry of Education",
	"mof.gov.in": "Ministry of Finance",
	"finmin.nic.in": "Ministry of Finance",
	"socialjustice.gov.in": "Ministry of Social Justice",
	"wcd.nic.in": "Ministry of WCD",
	"ncw.nic.in": "NCW",
	"cag.gov.in": "CAG of India",
	"nhrc.nic.in": "NHRC",
	"darpg.gov.in": "DARPG",
	"lawcommissionofindia.nic.in": "Law Commission",
	"panchayat.gov.in": "Ministry of Panchayati Raj",
	"rural.nic.in": "Ministry of Rural Development",
	"moef.gov.in": "MoEFCC",
	"isro.gov.in": "ISRO",
	"drdo.gov.in": "DRDO",
	"dst.gov.in": "DST India",
	"meity.gov.in": "MeitY",
	"ndma.gov.in": "NDMA",
	"imd.gov.in": "IMD",
	"censusindia.gov.in": "Census India",
	"indiabudget.gov.in": "Union Budget",
};

export function formatDomainToWebsiteName(rawHost: string): string {
	if (!rawHost) return "Web Source";
	const host = rawHost.replace(/^(?:www|m|mobile)\./i, "").toLowerCase();

	// 1. Direct match or subdomain suffix match (e.g. en.wikipedia.org -> wikipedia.org)
	if (KNOWN_WEBSITE_NAMES[host]) {
		return KNOWN_WEBSITE_NAMES[host];
	}
	for (const [domain, brand] of Object.entries(KNOWN_WEBSITE_NAMES)) {
		if (host === domain || host.endsWith(`.${domain}`)) {
			return brand;
		}
	}

	// 2. Handle Indian government and institutional domains (*.gov.in, *.nic.in, *.ac.in)
	const ccTldMatch = host.match(
		/^([a-z0-9-]+)\.(gov|nic|ac|edu|res|org|co)\.(in|uk|au)$/i,
	);
	if (ccTldMatch) {
		const name = ccTldMatch[1];
		const type = ccTldMatch[2].toLowerCase();
		if (name.length <= 5) {
			return `${name.toUpperCase()}.${type}`;
		}
		const titleCased = name.charAt(0).toUpperCase() + name.slice(1);
		return `${titleCased} (${type}.in)`;
	}

	// 3. General domain extraction: take the second-level domain (e.g. 'khanacademy' from 'khanacademy.org')
	const parts = host.split(".");
	const domainCore = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

	// Clean dashes or underscores and format to title case
	const words = domainCore.split(/[-_]+/).filter(Boolean);
	if (words.length > 0) {
		const ACRONYMS = new Set([
			"ias",
			"pib",
			"bbc",
			"mit",
			"who",
			"rbi",
			"sci",
			"eci",
			"cag",
			"dst",
			"un",
		]);
		return words
			.map((w, idx) => {
				const lower = w.toLowerCase();
				if (ACRONYMS.has(lower)) return lower.toUpperCase();
				if (
					idx > 0 &&
					(lower === "to" ||
						lower === "of" ||
						lower === "in" ||
						lower === "on" ||
						lower === "and" ||
						lower === "for")
				) {
					return lower.charAt(0).toUpperCase() + lower.slice(1);
				}
				return lower.charAt(0).toUpperCase() + lower.slice(1);
			})
			.join(" ");
	}

	return domainCore.charAt(0).toUpperCase() + domainCore.slice(1);
}

export function getDisplaySourceName(item: WebSearchResultItem): string {
	// If a custom label is provided and NOT a generic search engine name, use it
	if (item.source && item.source.trim().length > 0) {
		const srcClean = item.source.trim();
		if (!SEARCH_ENGINE_PROVIDERS.has(srcClean.toLowerCase())) {
			return srcClean;
		}
	}

	const url = unwrapUrl(item.url);
	const host = getHostname(url);

	// If host is a real domain (and not duckduckgo / localhost), format it nicely
	if (host && !host.includes("duckduckgo.com") && !host.includes("localhost")) {
		return formatDomainToWebsiteName(host);
	}

	// Try extracting from title if title has a brand suffix: "Article - Source Name" or "Article | Source Name"
	if (item.title) {
		const match = item.title.match(/(?:[-–—|]\s*)([A-Za-z0-9\s&.']+)$/);
		if (match && match[1].trim().length > 1 && match[1].trim().length < 35) {
			const candidate = match[1].trim();
			if (!SEARCH_ENGINE_PROVIDERS.has(candidate.toLowerCase())) {
				return candidate;
			}
		}
	}

	if (host && !host.includes("duckduckgo.com")) {
		return formatDomainToWebsiteName(host);
	}

	return "Web Source";
}

const STOP_WORDS = new Set([
	"the",
	"and",
	"for",
	"with",
	"this",
	"that",
	"from",
	"have",
	"been",
	"which",
	"also",
	"their",
	"such",
	"than",
	"more",
	"into",
	"over",
	"they",
	"will",
	"when",
	"what",
	"where",
	"about",
	"some",
	"both",
	"then",
	"them",
	"these",
	"those",
	"under",
	"after",
	"other",
]);

export function matchContextSources(
	text: string,
	allSources?: WebSearchResultItem[],
	fallbackIndex = 0,
): WebSearchResultItem[] {
	if (!allSources || allSources.length === 0) return [];
	if (!text || text.trim().length === 0) {
		const fallback = allSources[fallbackIndex % allSources.length];
		return fallback ? [fallback] : [];
	}

	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2 && !STOP_WORDS.has(t));

	if (tokens.length === 0) {
		const fallback = allSources[fallbackIndex % allSources.length];
		return fallback ? [fallback] : [];
	}

	// Score each source based on matching tokens in title, snippet, and source/hostname
	const scored = allSources.map((source) => {
		const srcText =
			`${source.title} ${source.snippet} ${source.source || ""} ${source.url}`.toLowerCase();
		let score = 0;
		for (const token of tokens) {
			if (srcText.includes(token)) {
				// Title matches get extra weight
				if (source.title.toLowerCase().includes(token)) {
					score += 3;
				} else {
					score += 1;
				}
			}
		}
		return { source, score };
	});

	scored.sort((a, b) => b.score - a.score);

	// If the top scored has a positive match score, return top 1 or 2 matching sources
	if (scored[0].score > 0) {
		const best = scored.filter(
			(s) => s.score >= Math.max(2, scored[0].score * 0.6),
		);
		return best.slice(0, 2).map((s) => s.source);
	}

	// Fallback to indexed source so every bullet gets a distributed citation
	const fallback = allSources[fallbackIndex % allSources.length];
	return fallback ? [fallback] : [];
}
