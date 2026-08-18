import type { Topic } from "../types/topic.types";

const API_BASE = "/api/topics";

export interface TopicsApi {
	available: boolean;
	list(): Promise<Topic[]>;
	get(id: string): Promise<Topic | null>;
	create(topic: Topic): Promise<Topic>;
	update(id: string, topic: Topic): Promise<Topic>;
	remove(id: string): Promise<void>;
	replaceAll(topics: Topic[]): Promise<void>;
}

export class ServerTopicsApi implements TopicsApi {
	readonly available = true;

	private async request(path: string, init?: RequestInit): Promise<Response> {
		const response = await fetch(`${API_BASE}${path}`, {
			...init,
			headers: { "Content-Type": "application/json", ...init?.headers },
		});
		if (!response.ok) {
			throw new Error(`Server API error: ${response.status}`);
		}
		return response;
	}

	private async json<T>(res: Response): Promise<T> {
		const text = await res.text();
		try {
			return (text ? JSON.parse(text) : {}) as T;
		} catch {
			throw new Error(
				`Server returned invalid JSON (${res.status} ${res.statusText}): ${text.slice(0, 100)}`,
			);
		}
	}

	async list(): Promise<Topic[]> {
		const res = await this.request("");
		const data = await this.json<{ topics: Topic[] }>(res);
		return data.topics;
	}

	async get(id: string): Promise<Topic | null> {
		const res = await this.request(`/${encodeURIComponent(id)}`);
		const data = await this.json<{ topic: Topic }>(res);
		return data.topic;
	}

	async create(topic: Topic): Promise<Topic> {
		const res = await this.request("", {
			method: "POST",
			body: JSON.stringify(topic),
		});
		const data = await this.json<{ topic: Topic }>(res);
		return data.topic;
	}

	async update(id: string, topic: Topic): Promise<Topic> {
		const res = await this.request(`/${encodeURIComponent(id)}`, {
			method: "PUT",
			body: JSON.stringify(topic),
		});
		const data = await this.json<{ topic: Topic }>(res);
		return data.topic;
	}

	async remove(id: string): Promise<void> {
		await this.request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
	}

	async replaceAll(topics: Topic[]): Promise<void> {
		await this.request("/import", {
			method: "POST",
			body: JSON.stringify({ topics }),
		});
	}
}
