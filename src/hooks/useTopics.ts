import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	clearAndReplaceStoredTopics,
	getAllStoredTopics,
	migrateFromLocalStorage,
} from "../services/storage/idbTopics";
import { ServerTopicsApi } from "../services/topicsApi";
import type { CategoryType, Topic } from "../types/topic.types";

const TOPICS_QUERY_KEY = ["topics"] as const;

type SyncState = "offline" | "syncing" | "online";

function deduplicateTopics(items: Topic[]): Topic[] {
	const seen = new Set<string>();
	const result: Topic[] = [];
	for (const item of items) {
		if (item?.id && !seen.has(item.id)) {
			seen.add(item.id);
			result.push(item);
		}
	}
	return result;
}

export function useTopics() {
	const queryClient = useQueryClient();
	const [syncState, setSyncState] = useState<SyncState>("offline");
	const initialTopicsRef = useRef<Topic[]>([]);

	const api = useMemo(() => new ServerTopicsApi(), []);

	// Background migration and fast cold-start cache restore from IndexedDB
	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const migrated = await migrateFromLocalStorage();
			if (!isMounted) return;
			if (migrated && migrated.length > 0) {
				queryClient.setQueryData<Topic[]>(
					TOPICS_QUERY_KEY,
					(old) => old ?? migrated,
				);
			} else {
				const idbStored = await getAllStoredTopics();
				if (!isMounted) return;
				if (idbStored && idbStored.length > 0) {
					queryClient.setQueryData<Topic[]>(
						TOPICS_QUERY_KEY,
						(old) => old ?? idbStored,
					);
				}
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [queryClient]);

	const {
		data: topics = [],
		isLoading: loading,
		isError,
	} = useQuery({
		queryKey: TOPICS_QUERY_KEY,
		queryFn: async () => {
			try {
				const serverTopics = deduplicateTopics(await api.list());
				initialTopicsRef.current = serverTopics;
				void clearAndReplaceStoredTopics(serverTopics);
				return serverTopics;
			} catch {
				const idbStored = await getAllStoredTopics();
				if (idbStored && idbStored.length > 0) {
					initialTopicsRef.current = idbStored;
					return idbStored;
				}
				const migrated = await migrateFromLocalStorage();
				if (migrated && migrated.length > 0) {
					initialTopicsRef.current = migrated;
					return migrated;
				}
				const res = await fetch("/data/topics.json");
				if (!res.ok) throw new Error("Failed to load topics data");
				const seedTopics = deduplicateTopics((await res.json()) as Topic[]);
				initialTopicsRef.current = seedTopics;
				void clearAndReplaceStoredTopics(seedTopics);
				return seedTopics;
			}
		},
	});

	const error = isError
		? "Failed to sync with server. Using local data only."
		: null;

	const updateCache = useCallback(
		(updater: (old: Topic[] | undefined) => Topic[]) => {
			queryClient.setQueryData<Topic[]>(TOPICS_QUERY_KEY, (old) => {
				const next = deduplicateTopics(updater(old));
				void clearAndReplaceStoredTopics(next);
				return next;
			});
		},
		[queryClient],
	);

	const rollbackCache = useCallback(
		(previous: Topic[] | undefined) => {
			if (previous) {
				const deduped = deduplicateTopics(previous);
				queryClient.setQueryData<Topic[]>(TOPICS_QUERY_KEY, deduped);
				void clearAndReplaceStoredTopics(deduped);
			}
		},
		[queryClient],
	);

	const addTopicMutation = useMutation({
		mutationFn: (topic: Topic) => api.create(topic),
		onMutate: async (topic) => {
			await queryClient.cancelQueries({ queryKey: TOPICS_QUERY_KEY });
			const previous = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY);
			updateCache((old) => [
				topic,
				...(old?.filter((t) => t.id !== topic.id) ?? []),
			]);
			setSyncState("syncing");
			return { previous };
		},
		onError: (_err, _topic, context) => {
			rollbackCache(context?.previous);
			setSyncState("offline");
		},
		onSuccess: () => {
			setSyncState("online");
		},
	});

	const addTopic = useCallback(
		(
			topic: Omit<Topic, "id" | "createdAt" | "updatedAt"> &
				Partial<Pick<Topic, "id">>,
		): Topic => {
			const newTopic: Topic = {
				...(topic as Topic),
				id: topic.id || generateId(topic.title),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			addTopicMutation.mutate(newTopic);
			return newTopic;
		},
		[addTopicMutation],
	);

	const updateTopicMutation = useMutation({
		mutationFn: ({ id, topic }: { id: string; topic: Topic }) =>
			api.update(id, topic),
		onMutate: async ({ id, topic }) => {
			await queryClient.cancelQueries({ queryKey: TOPICS_QUERY_KEY });
			const previous = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY);
			updateCache((old) => old?.map((t) => (t.id === id ? topic : t)) ?? []);
			setSyncState("syncing");
			return { previous };
		},
		onError: (_err, _vars, context) => {
			rollbackCache(context?.previous);
			setSyncState("offline");
		},
		onSuccess: () => {
			setSyncState("online");
		},
	});

	const updateTopic = useCallback(
		(id: string, updates: Partial<Topic>): boolean => {
			const current = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY) ?? [];
			const existing = current.find((t) => t.id === id);
			if (!existing) return false;
			const updated: Topic = {
				...existing,
				...updates,
				id,
				updatedAt: new Date().toISOString(),
			};
			updateTopicMutation.mutate({ id, topic: updated });
			return true;
		},
		[queryClient, updateTopicMutation],
	);

	const deleteTopicMutation = useMutation({
		mutationFn: (id: string) => api.remove(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: TOPICS_QUERY_KEY });
			const previous = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY);
			updateCache((old) => old?.filter((t) => t.id !== id) ?? []);
			setSyncState("syncing");
			return { previous };
		},
		onError: (_err, _id, context) => {
			rollbackCache(context?.previous);
			setSyncState("offline");
		},
		onSuccess: () => {
			setSyncState("online");
		},
	});

	const deleteTopic = useCallback(
		(id: string): boolean => {
			const current = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY) ?? [];
			if (!current.some((t) => t.id === id)) return false;
			deleteTopicMutation.mutate(id);
			return true;
		},
		[queryClient, deleteTopicMutation],
	);

	const replaceAllMutation = useMutation({
		mutationFn: (items: Topic[]) => api.replaceAll(items),
		onMutate: async (items) => {
			await queryClient.cancelQueries({ queryKey: TOPICS_QUERY_KEY });
			const previous = queryClient.getQueryData<Topic[]>(TOPICS_QUERY_KEY);
			updateCache(() => items);
			setSyncState("syncing");
			return { previous };
		},
		onError: (_err, _items, context) => {
			rollbackCache(context?.previous);
			setSyncState("offline");
		},
		onSuccess: () => {
			setSyncState("online");
		},
	});

	const getTopic = useCallback(
		(id: string): Topic | undefined => {
			return topics.find((t) => t.id === id);
		},
		[topics],
	);

	const searchTopics = useCallback(
		(query: string): Topic[] => {
			const q = query.trim().toLowerCase();
			if (!q) return topics;
			return topics.filter(
				(t) =>
					t.title.toLowerCase().includes(q) ||
					t.meaning.toLowerCase().includes(q) ||
					(t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
			);
		},
		[topics],
	);

	const getByCategory = useCallback(
		(category: CategoryType): Topic[] => {
			return topics.filter((t) => t.category === category);
		},
		[topics],
	);

	const resetToSeed = useCallback(() => {
		const baseline = initialTopicsRef.current;
		replaceAllMutation.mutate(baseline);
	}, [replaceAllMutation]);

	const exportTopics = useCallback((): string => {
		return JSON.stringify(topics, null, 2);
	}, [topics]);

	const importTopics = useCallback(
		(json: string): boolean => {
			try {
				const parsed = JSON.parse(json);
				if (!Array.isArray(parsed)) return false;
				replaceAllMutation.mutate(parsed as Topic[]);
				return true;
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				console.error("Failed to import topics:", msg);
				return false;
			}
		},
		[replaceAllMutation],
	);

	const stats = useMemo(
		() => ({
			total: topics.length,
			byCategory: topics.reduce<Record<string, number>>((acc, t) => {
				acc[t.category] = (acc[t.category] || 0) + 1;
				return acc;
			}, {}),
			lastUpdated: topics.length > 0 ? topics[0].updatedAt : null,
			sourceBreakdown: topics.reduce<Record<string, number>>((acc, t) => {
				acc[t.source] = (acc[t.source] || 0) + 1;
				return acc;
			}, {}),
		}),
		[topics],
	);

	return {
		topics,
		loading,
		error,
		syncState,
		stats,
		addTopic,
		updateTopic,
		deleteTopic,
		getTopic,
		searchTopics,
		getByCategory,
		resetToSeed,
		exportTopics,
		importTopics,
	};
}

function generateId(title: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 40);
	return `${base}-${Date.now().toString(36)}`;
}
