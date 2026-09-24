import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	username: text("username").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	salt: text("salt").notNull(),
	role: text("role").default("user").notNull(),
	createdAt: text("created_at").notNull(),
});

export const sessions = pgTable("sessions", {
	token: text("token").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: text("created_at").notNull(),
	expiresAt: text("expires_at").notNull(),
});

export const topics = pgTable(
	"topics",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		category: text("category").notNull(),
		meaning: text("meaning").notNull(),
		quoteText: text("quote_text").notNull(),
		quoteSource: text("quote_source").notNull(),
		pros: text("pros").notNull(),
		cons: text("cons").notNull(),
		wayForward: text("way_forward").notNull(),
		conclusionNegative: text("conclusion_negative").notNull(),
		conclusionPositive: text("conclusion_positive").notNull(),
		conclusionRaw: text("conclusion_raw"),
		source: text("source").notNull(),
		tags: text("tags"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => [
		index("topics_user_id_idx").on(table.userId),
		index("topics_user_updated_idx").on(table.userId, table.updatedAt),
		index("topics_user_cat_updated_idx").on(
			table.userId,
			table.category,
			table.updatedAt,
		),
	],
);

export const apiKeys = pgTable(
	"api_keys",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		provider: text("provider").notNull(),
		encrypted: text("encrypted").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => [
		index("api_keys_user_id_idx").on(table.userId),
		uniqueIndex("api_keys_user_kind_provider_idx").on(
			table.userId,
			table.kind,
			table.provider,
		),
	],
);
