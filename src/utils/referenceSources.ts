import type { WebSearchResultItem } from "../types/search.types";
import type { CategoryType } from "../types/topic.types";

const CATEGORY_REFERENCES: Record<CategoryType, WebSearchResultItem[]> = {
	"Science & Tech": [
		{
			title: "NITI Aayog — National Strategy for AI & Emerging Tech",
			url: "https://www.niti.gov.in/national-strategy-artificial-intelligence",
			snippet:
				"Foundational policy roadmap for responsible adoption of artificial intelligence and deep-tech innovation across key sectors.",
			source: "niti.gov.in",
		},
		{
			title: "Ministry of Electronics & IT (MeitY) — Digital India Framework",
			url: "https://www.meity.gov.in/digital-india-programme",
			snippet:
				"Statutory guidelines, data governance architectures, and cyber-security standards for digital public infrastructure.",
			source: "meity.gov.in",
		},
		{
			title: "DST — Science, Technology & Innovation Policy (STIP)",
			url: "https://dst.gov.in/stip-2020",
			snippet:
				"National R&D vision, indigenous technology transfer, and institutional research incentives for emerging domains.",
			source: "dst.gov.in",
		},
		{
			title: "PRS Legislative Research — Science & Technology Policy Briefs",
			url: "https://prsindia.org",
			snippet:
				"Objective analytical summaries of parliamentary committee reports and technology regulatory bills.",
			source: "prsindia.org",
		},
	],
	Polity: [
		{
			title: "Constitution of India — Ministry of Law & Justice",
			url: "https://legislative.gov.in/constitution-of-india",
			snippet:
				"Official authoritative text of constitutional articles, schedules, fundamental rights, and institutional provisions.",
			source: "legislative.gov.in",
		},
		{
			title: "Supreme Court of India — Landmark Constitutional Precedents",
			url: "https://main.sci.gov.in",
			snippet:
				"Constitutional bench verdicts, basic structure jurisprudence, and authoritative judicial interpretations.",
			source: "sci.gov.in",
		},
		{
			title: "Law Commission of India — Structural & Judicial Reform Reports",
			url: "https://lawcommissionofindia.nic.in",
			snippet:
				"Comprehensive consultative reports on electoral reforms, legal codification, and justice administration.",
			source: "lawcommissionofindia.nic.in",
		},
		{
			title: "PRS Legislative Research — Parliamentary Procedures & Acts",
			url: "https://prsindia.org",
			snippet:
				"Detailed legislative analysis of constitutional amendment acts and statutory bills.",
			source: "prsindia.org",
		},
	],
	Governance: [
		{
			title: "2nd Administrative Reforms Commission (ARC) — Reports",
			url: "https://darpg.gov.in/arc-reports",
			snippet:
				"Citizen-centric administration, e-governance promotion, and civil services accountability blueprints.",
			source: "darpg.gov.in",
		},
		{
			title: "Central Vigilance Commission (CVC) — Accountability Framework",
			url: "https://cvc.gov.in",
			snippet:
				"Institutional mechanisms for transparency, administrative integrity, and preventive vigilance in governance.",
			source: "cvc.gov.in",
		},
		{
			title: "Ministry of Panchayati Raj — Decentralized Planning Directives",
			url: "https://panchayat.gov.in",
			snippet:
				"73rd Amendment devolution mandates, local governance efficiency metrics, and grassroots participatory planning.",
			source: "panchayat.gov.in",
		},
		{
			title: "NITI Aayog — Good Governance & Performance Index",
			url: "https://www.niti.gov.in",
			snippet:
				"State ranking indices on public service delivery, administrative efficiency, and transparency benchmarks.",
			source: "niti.gov.in",
		},
	],
	Economy: [
		{
			title: "Ministry of Finance — Economic Survey of India",
			url: "https://www.indiabudget.gov.in/economicsurvey",
			snippet:
				"Authoritative macroeconomic analysis, sector-wise growth trends, and structural fiscal policy reviews.",
			source: "indiabudget.gov.in",
		},
		{
			title: "Reserve Bank of India (RBI) — Currency & Finance Reports",
			url: "https://www.rbi.org.in",
			snippet:
				"Monetary policy reviews, financial stability indicators, and banking sector soundness benchmarks.",
			source: "rbi.org.in",
		},
		{
			title: "NITI Aayog — Strategy for New India & Action Agenda",
			url: "https://www.niti.gov.in",
			snippet:
				"Development roadmaps across infrastructure, manufacturing competitiveness, and inclusive economic growth.",
			source: "niti.gov.in",
		},
		{
			title: "World Bank / IMF — India Macroeconomic Updates",
			url: "https://www.worldbank.org/en/country/india",
			snippet:
				"Global comparative metrics on trade integration, demographic dividend, and labor productivity in India.",
			source: "worldbank.org",
		},
	],
	Society: [
		{
			title: "Ministry of Social Justice & Empowerment — Annual Reports",
			url: "https://socialjustice.gov.in",
			snippet:
				"Statutory welfare schemes, vulnerable community upliftment frameworks, and affirmative action policies.",
			source: "socialjustice.gov.in",
		},
		{
			title: "National Family Health Survey (NFHS) — Demographic Data",
			url: "http://rchiips.org/nfhs",
			snippet:
				"Comprehensive social health indicators, child nutrition metrics, and gender empowerment statistics.",
			source: "rchiips.org",
		},
		{
			title: "National Commission for Women (NCW) / NCPCR — Policy Briefs",
			url: "https://ncw.nic.in",
			snippet:
				"Institutional recommendations on gender justice, child protection, and social safety nets.",
			source: "ncw.nic.in",
		},
		{
			title: "NITI Aayog — Aspirational Districts Social Transformation",
			url: "https://www.niti.gov.in",
			snippet:
				"Targeted convergence initiatives across health, nutrition, education, and basic infrastructure.",
			source: "niti.gov.in",
		},
	],
	IR: [
		{
			title: "Ministry of External Affairs (MEA) — Foreign Policy Documents",
			url: "https://www.mea.gov.in",
			snippet:
				"Official diplomatic statements, bilateral treaty frameworks, and multilateral engagement strategies.",
			source: "mea.gov.in",
		},
		{
			title: "Observer Research Foundation (ORF) — Strategic Studies",
			url: "https://www.orfonline.org",
			snippet:
				"In-depth research on Indo-Pacific security, neighborhood diplomacy, and global multilateral governance.",
			source: "orfonline.org",
		},
		{
			title: "MP-IDSA — Defence & Strategic Security Analysis",
			url: "https://www.idsa.in",
			snippet:
				"Scholarly assessments of regional geopolitical stability, cross-border security, and international treaties.",
			source: "idsa.in",
		},
		{
			title: "United Nations — International Conventions & Treaties",
			url: "https://www.un.org",
			snippet:
				"Multilateral agreements on international law, global governance, and sustainable development goals.",
			source: "un.org",
		},
	],
	Environment: [
		{
			title: "MoEFCC — State of Environment & Climate Reports",
			url: "https://moef.gov.in",
			snippet:
				"National biodiversity action plans, forest conservation policies, and emissions reduction pathways.",
			source: "moef.gov.in",
		},
		{
			title: "Central Pollution Control Board (CPCB) — Environmental Standards",
			url: "https://cpcb.nic.in",
			snippet:
				"Statutory environmental mandates on air/water quality indices and hazardous waste management.",
			source: "cpcb.nic.in",
		},
		{
			title: "National Green Tribunal (NGT) — Environmental Jurisprudence",
			url: "https://greentribunal.gov.in",
			snippet:
				"Key judicial orders on sustainable development, polluter pays principle, and public trust doctrine.",
			source: "greentribunal.gov.in",
		},
		{
			title: "UNEP & UNFCCC — Global Climate Action Guidelines",
			url: "https://unfccc.int",
			snippet:
				"International treaties on carbon neutrality, climate finance commitments, and renewable transitions.",
			source: "unfccc.int",
		},
	],
	Ethics: [
		{
			title: "2nd ARC 4th Report — Ethics in Governance",
			url: "https://darpg.gov.in/arc-reports",
			snippet:
				"Landmark institutional blueprint detailing ethical codes for civil servants, code of conduct, and ombudsman institutions.",
			source: "darpg.gov.in",
		},
		{
			title: "Nolan Committee — Seven Principles of Public Life",
			url: "https://www.gov.uk/government/organisations/the-committee-on-standards-in-public-life",
			snippet:
				"Foundational ethical standards: Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty, and Leadership.",
			source: "gov.uk",
		},
		{
			title: "Indian Institute of Public Administration (IIPA) — Ethics Series",
			url: "https://www.iipa.org.in",
			snippet:
				"Scholarly case studies on administrative dilemma resolution, moral reasoning, and constitutional morality.",
			source: "iipa.org.in",
		},
		{
			title: "Law Commission of India — Public Probity & Integrity Frameworks",
			url: "https://lawcommissionofindia.nic.in",
			snippet:
				"Legal recommendations on conflict of interest management, whistleblower protections, and anti-corruption acts.",
			source: "lawcommissionofindia.nic.in",
		},
	],
	Geography: [
		{
			title: "Survey of India & National Atlas (NATMO)",
			url: "https://surveyofindia.gov.in",
			snippet:
				"Authoritative topographic maps, territorial boundaries, and national geospatial data infrastructure.",
			source: "surveyofindia.gov.in",
		},
		{
			title: "National Disaster Management Authority (NDMA) — Guidelines",
			url: "https://ndma.gov.in",
			snippet:
				"Standard operating procedures and vulnerability mapping for seismic, flood, and cyclone disaster risk reduction.",
			source: "ndma.gov.in",
		},
		{
			title: "Indian Meteorological Department (IMD) — Monsoon & Climate Data",
			url: "https://mausam.imd.gov.in",
			snippet:
				"Official meteorological observations on agro-climatic zones, monsoon variability, and extreme weather events.",
			source: "imd.gov.in",
		},
		{
			title: "ISRO Bhuvan — Geo-Spatial Resource Portal",
			url: "https://bhuvan.nrsc.gov.in",
			snippet:
				"Satellite imagery and thematic GIS layers for watershed management, land-use planning, and soil health monitoring.",
			source: "isro.gov.in",
		},
	],
	History: [
		{
			title: "Archaeological Survey of India (ASI) — Heritage Archives",
			url: "https://asi.nic.in",
			snippet:
				"Official documentation and architectural surveys of ancient monuments, archaeological excavations, and cultural heritage.",
			source: "asi.nic.in",
		},
		{
			title: "National Archives of India — Historical Records & Treaties",
			url: "https://nationalarchives.nic.in",
			snippet:
				"Primary source records, state correspondence, and colonial administrative manuscripts for modern Indian history.",
			source: "nationalarchives.nic.in",
		},
		{
			title: "Indian Council of Historical Research (ICHR)",
			url: "https://ichr.ac.in",
			snippet:
				"Scholarly monographs on socio-economic history, national movement dynamics, and historiography.",
			source: "ichr.ac.in",
		},
		{
			title: "NCERT — Themes in Indian History (Class XI & XII)",
			url: "https://ncert.nic.in",
			snippet:
				"Standard UPSC foundational curriculum on ancient, medieval, and modern Indian freedom struggle trajectories.",
			source: "ncert.nic.in",
		},
	],
	"Internal Security": [
		{
			title: "Ministry of Home Affairs (MHA) — Annual Security Reports",
			url: "https://www.mha.gov.in",
			snippet:
				"Official annual assessments on border management, left-wing extremism, counter-terrorism, and police modernization.",
			source: "mha.gov.in",
		},
		{
			title:
				"Manohar Parrikar Institute for Defence Studies and Analyses (MP-IDSA)",
			url: "https://www.idsa.in",
			snippet:
				"Strategic research, defense policy papers, cyber warfare doctrines, and national security policy frameworks.",
			source: "idsa.in",
		},
		{
			title: "Bureau of Police Research and Development (BPR&D)",
			url: "https://bprd.nic.in",
			snippet:
				"Studies on criminal justice administration, smart policing initiatives, cyber security forensics, and correctional reforms.",
			source: "bprd.nic.in",
		},
		{
			title:
				"National Cyber Security Coordinator (NCSC) — Cyber Security Guidelines",
			url: "https://www.cybercrime.gov.in",
			snippet:
				"Standard operating frameworks for critical information infrastructure protection and cyber resilience.",
			source: "cybercrime.gov.in",
		},
	],
	Sociology: [
		{
			title: "Economic and Political Weekly (EPW) — Sociology of India",
			url: "https://www.epw.in",
			snippet:
				"Peer-reviewed academic research on social stratification, caste dynamics, agrarian class relations, and gender empowerment.",
			source: "epw.in",
		},
		{
			title: "Ministry of Social Justice and Empowerment — Policies & Schemes",
			url: "https://socialjustice.gov.in",
			snippet:
				"Statutory acts, affirmative action frameworks, and welfare metrics for marginalized and vulnerable communities.",
			source: "socialjustice.gov.in",
		},
		{
			title: "Census of India & NSO — Socio-Economic Indicators",
			url: "https://censusindia.gov.in",
			snippet:
				"Authoritative demographic data on population trends, urbanization patterns, literacy rates, and migration dynamics.",
			source: "censusindia.gov.in",
		},
		{
			title: "Indian Sociological Society (ISS) — Sociological Bulletin",
			url: "https://insoso.org",
			snippet:
				"Foundational academic journal on social change, kinship structures, tribal development, and social movements in India.",
			source: "insoso.org",
		},
	],
	"Disaster Management": [
		{
			title:
				"National Disaster Management Authority (NDMA) — Guidelines & Plans",
			url: "https://ndma.gov.in",
			snippet:
				"National disaster management plans, standard operating procedures, and risk mitigation guidelines for earthquakes, floods, and cyclones.",
			source: "ndma.gov.in",
		},
		{
			title: "National Institute of Disaster Management (NIDM)",
			url: "https://nidm.gov.in",
			snippet:
				"Capacity building, disaster risk reduction (DRR) strategies, and climate change adaptation research.",
			source: "nidm.gov.in",
		},
		{
			title: "India Meteorological Department (IMD) — Early Warning Bulletin",
			url: "https://mausam.imd.gov.in",
			snippet:
				"Monsoon tracking, cyclone early warning systems, heatwave vulnerability indices, and agro-meteorological advisories.",
			source: "imd.gov.in",
		},
		{
			title: "UNDRR — Sendai Framework for Disaster Risk Reduction (2015-2030)",
			url: "https://www.undrr.org",
			snippet:
				"Global targets and priorities for building resilient infrastructure and community-centric disaster preparedness.",
			source: "undrr.org",
		},
	],
};

export function getDefaultCategorySources(
	category?: CategoryType | string,
	_topicTitle?: string,
): WebSearchResultItem[] {
	if (!category) return CATEGORY_REFERENCES.Polity;
	const catKey = category as CategoryType;
	return CATEGORY_REFERENCES[catKey] ?? CATEGORY_REFERENCES.Polity;
}
