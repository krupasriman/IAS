export type CategoryType =
	| "Polity"
	| "History"
	| "Geography"
	| "Economy"
	| "Ethics"
	| "Governance"
	| "IR"
	| "Society"
	| "Environment"
	| "Science & Tech";

export interface ProConItem {
	id?: string;
	title: string;
	explanation: string;
	example: string;
}

export interface Topic {
	id: string;
	title: string;
	category: CategoryType;
	meaning: string;
	quote: {
		text: string;
		source: string;
	};
	pros: ProConItem[];
	cons: ProConItem[];
	wayForward: string[];
	conclusion:
		| {
				negative: string;
				positive: string;
		  }
		| string;
	source: "local" | "web";
	tags?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ValidationReport {
	isValid: boolean;
	score: number; // 0 to 100
	warnings: string[];
	wordCounts: {
		meaning: number;
		quote: number;
		wayForward: number;
		conclusion: number;
	};
}
