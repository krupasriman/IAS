import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const topics = sqliteTable("topics", {
	id: text("id").primaryKey(),
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
});

export const apiKeys = sqliteTable("api_keys", {
	id: text("id").primaryKey(),
	kind: text("kind").notNull(),
	provider: text("provider").notNull(),
	encrypted: text("encrypted").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	username: text("username").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
	token: text("token").primaryKey(),
	userId: text("user_id").notNull(),
	createdAt: text("created_at").notNull(),
	expiresAt: text("expires_at").notNull(),
});
