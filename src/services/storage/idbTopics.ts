import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Topic } from "../../types/topic.types";

interface IasDB extends DBSchema {
	topics: {
		key: string;
		value: Topic;
		indexes: {
			"by-category": string;
			"by-updatedAt": string;
		};
	};
}

const DB_NAME = "ias_notes_db";
const DB_VERSION = 1;
const STORE_NAME = "topics";
const LEGACY_STORAGE_KEY = "ias_topics";

let dbPromise: Promise<IDBPDatabase<IasDB>> | null = null;

function getDB(): Promise<IDBPDatabase<IasDB>> {
	if (!dbPromise) {
		dbPromise = openDB<IasDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
					store.createIndex("by-category", "category");
					store.createIndex("by-updatedAt", "updatedAt");
				}
			},
		});
	}
	return dbPromise;
}

export async function getAllStoredTopics(): Promise<Topic[]> {
	try {
		const db = await getDB();
		const items = await db.getAll(STORE_NAME);
		return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	} catch (err) {
		console.warn("Failed to read topics from IndexedDB:", err);
		return [];
	}
}

export async function getStoredTopic(id: string): Promise<Topic | null> {
	try {
		const db = await getDB();
		const item = await db.get(STORE_NAME, id);
		return item ?? null;
	} catch (err) {
		console.warn(`Failed to read topic ${id} from IndexedDB:`, err);
		return null;
	}
}

export async function saveStoredTopic(topic: Topic): Promise<void> {
	try {
		const db = await getDB();
		await db.put(STORE_NAME, topic);
	} catch (err) {
		console.warn(`Failed to save topic ${topic.id} to IndexedDB:`, err);
	}
}

export async function saveStoredTopics(topicsList: Topic[]): Promise<void> {
	try {
		const db = await getDB();
		const tx = db.transaction(STORE_NAME, "readwrite");
		for (const topic of topicsList) {
			if (topic?.id) {
				await tx.store.put(topic);
			}
		}
		await tx.done;
	} catch (err) {
		console.warn("Failed to bulk save topics to IndexedDB:", err);
	}
}

export async function clearAndReplaceStoredTopics(
	topicsList: Topic[],
): Promise<void> {
	try {
		const db = await getDB();
		const tx = db.transaction(STORE_NAME, "readwrite");
		await tx.store.clear();
		for (const topic of topicsList) {
			if (topic?.id) {
				await tx.store.put(topic);
			}
		}
		await tx.done;
	} catch (err) {
		console.warn("Failed to replace topics in IndexedDB:", err);
	}
}

export async function deleteStoredTopic(id: string): Promise<void> {
	try {
		const db = await getDB();
		await db.delete(STORE_NAME, id);
	} catch (err) {
		console.warn(`Failed to delete topic ${id} from IndexedDB:`, err);
	}
}

export async function migrateFromLocalStorage(): Promise<Topic[] | null> {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.length > 0) {
			await saveStoredTopics(parsed as Topic[]);
			localStorage.removeItem(LEGACY_STORAGE_KEY);
			return parsed as Topic[];
		}
	} catch (err) {
		console.warn("Failed to migrate legacy topics from localStorage:", err);
	}
	return null;
}
