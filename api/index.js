var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/app.ts
import cors from "cors";
import express from "express";
import rateLimit2 from "express-rate-limit";
import helmet from "helmet";

// src/utils/logger.ts
import pino from "pino";
var isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
var isDev = process.env.NODE_ENV === "development" && !isServerless;
var logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev ? {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard" }
  } : void 0
});

// server/db/index.ts
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient as createWebClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apiKeys: () => apiKeys,
  sessions: () => sessions,
  topics: () => topics,
  users: () => users
});
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
var topics = sqliteTable("topics", {
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
  updatedAt: text("updated_at").notNull()
});
var apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  provider: text("provider").notNull(),
  encrypted: text("encrypted").notNull(),
  updatedAt: text("updated_at").notNull()
});
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull()
});
var sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull()
});

// server/db/index.ts
var customRequire;
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    customRequire = createRequire(import.meta.url);
  }
} catch {
}
function getDirname() {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
  }
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
}
var moduleDir = getDirname();
var isServerless2 = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
var DATA_DIR = path.resolve(moduleDir, "../../data");
var localDbPath = isServerless2 && !process.env.TURSO_DATABASE_URL ? "/tmp/ias.db" : path.join(DATA_DIR, "ias.db");
var url = process.env.TURSO_DATABASE_URL || `file:${localDbPath}`;
var authToken = process.env.TURSO_AUTH_TOKEN;
function createFallbackClient() {
  return {
    execute: async () => ({
      columns: [],
      columnTypes: [],
      rows: [],
      rowsAffected: 0,
      lastInsertRowid: void 0
    }),
    batch: async () => [],
    transaction: async () => ({
      execute: async () => ({
        columns: [],
        columnTypes: [],
        rows: [],
        rowsAffected: 0,
        lastInsertRowid: void 0
      }),
      batch: async () => [],
      executeMultiple: async () => {
      },
      rollback: async () => {
      },
      commit: async () => {
      },
      close: () => {
      },
      closed: false
    }),
    executeMultiple: async () => {
    },
    sync: async () => ({ frames_synced: 0, frame_no: 0 }),
    close: () => {
    },
    closed: false,
    protocol: "file"
  };
}
function createDbClient() {
  if (url.startsWith("libsql:") || url.startsWith("https:") || url.startsWith("http:")) {
    return createWebClient({ url, authToken });
  }
  if (isServerless2 && url.startsWith("file:")) {
    logger.warn(
      "Native SQLite driver unsupported in Serverless with local file; using fallback client"
    );
    return createFallbackClient();
  }
  try {
    if (url.startsWith("file:")) {
      try {
        const dbDir = path.dirname(localDbPath);
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
      }
    }
    if (!customRequire) throw new Error("createRequire not available");
    const { createClient: createNodeClient } = customRequire("@libsql/client");
    return createNodeClient({ url, authToken });
  } catch (err) {
    logger.warn(
      { err },
      "Native SQLite driver unavailable; using safe fallback client"
    );
    return createFallbackClient();
  }
}
var client = createDbClient();
var db = drizzle(client, { schema: schema_exports });
var INIT_SQL = `
CREATE TABLE IF NOT EXISTS api_keys (
	id text PRIMARY KEY NOT NULL,
	kind text NOT NULL,
	provider text NOT NULL,
	encrypted text NOT NULL,
	updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
	token text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	created_at text NOT NULL,
	expires_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS topics (
	id text PRIMARY KEY NOT NULL,
	title text NOT NULL,
	category text NOT NULL,
	meaning text NOT NULL,
	quote_text text NOT NULL,
	quote_source text NOT NULL,
	pros text NOT NULL,
	cons text NOT NULL,
	way_forward text NOT NULL,
	conclusion_negative text NOT NULL,
	conclusion_positive text NOT NULL,
	conclusion_raw text,
	source text NOT NULL,
	tags text,
	created_at text NOT NULL,
	updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
	id text PRIMARY KEY NOT NULL,
	username text NOT NULL,
	password_hash text NOT NULL,
	created_at text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
`;
async function runMigrations() {
  try {
    await client.executeMultiple(INIT_SQL);
    logger.info(
      { target: url.startsWith("file:") ? localDbPath : "Turso Cloud" },
      "Database schema initialized and ready"
    );
    const migrationsFolder = path.join(moduleDir, "../../drizzle");
    if (fs.existsSync(migrationsFolder)) {
      try {
        await migrate(db, { migrationsFolder });
      } catch {
      }
    }
  } catch (err) {
    logger.warn({ err }, "Database schema init completed or skipped");
  }
}
void runMigrations();

// server/services/auth.ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
var SESSION_COOKIE = "ias_session";
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function isAuthEnabled() {
  return process.env.AUTH_MODE === "session";
}
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}
async function verifyCredentials(username, password) {
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!row) return null;
  const expected = Buffer.from(row.passwordHash, "hex");
  const actual = Buffer.from(hashPassword(password), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return { id: row.id, username: row.username };
}
async function createSession(user) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    token,
    userId: user.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  });
  return token;
}
async function destroySession(token) {
  await db.delete(sessions).where(eq(sessions.token, token));
}
async function getSessionUser(token) {
  if (!token) return null;
  try {
    const [row] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return null;
    }
    const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    return user ? { id: user.id, username: user.username } : null;
  } catch {
    return null;
  }
}

// server/utils/errors.ts
function sendError(res, status, error, details) {
  const body = { error };
  if (details) body.details = details;
  res.status(status).json(body);
}
function sendValidationError(res, error, details) {
  sendError(res, 400, error, details);
}
function sendNotFound(res, message) {
  sendError(res, 404, message);
}
function sendServerError(res, error = "Internal server error") {
  sendError(res, 500, error);
}

// server/middleware/auth.ts
async function attachAuthUser(req, _res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE] ?? "";
    req.authUser = token ? await getSessionUser(token) : null;
  } catch {
    req.authUser = null;
  }
  next();
}
function maybeRequireAuth(req, res, next) {
  if (!isAuthEnabled() || req.authUser) {
    next();
    return;
  }
  sendError(res, 401, "Authentication required");
}

// server/routes/auth.ts
import { Router } from "express";
import { z } from "zod";
var router = Router();
var LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});
router.post("/auth/login", async (req, res) => {
  if (!isAuthEnabled()) {
    sendError(res, 403, "Authentication is disabled in local mode");
    return;
  }
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Invalid login request");
    return;
  }
  const user = await verifyCredentials(
    parsed.data.username,
    parsed.data.password
  );
  if (!user) {
    sendError(res, 401, "Invalid username or password");
    return;
  }
  const token = await createSession(user);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
  );
  res.json({ user });
});
router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] ?? "";
  if (token) {
    await destroySession(token);
  }
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
  res.json({ ok: true });
});
router.get("/auth/me", (req, res) => {
  res.json({
    user: req.authUser ?? null,
    authEnabled: isAuthEnabled()
  });
});
var auth_default = router;

// server/routes/generate.ts
import { Router as Router2 } from "express";
import { z as z5 } from "zod";

// src/utils/jsonSchema.ts
import { z as z3 } from "zod";

// src/utils/topicSchema.ts
import { z as z2 } from "zod";
var QuoteSchema = z2.object({
  text: z2.string().min(1).max(500),
  source: z2.string().min(1).max(200)
});
var ProConItemSchema = z2.object({
  title: z2.string().min(1).max(80),
  explanation: z2.string().min(1).max(300),
  example: z2.string().min(1).max(300)
});
var ConclusionSchema = z2.object({
  negative: z2.string().min(1).max(500),
  positive: z2.string().min(1).max(500)
});
var VALID_CATEGORIES = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Ethics",
  "Governance",
  "IR",
  "Society",
  "Environment",
  "Science & Tech",
  "Internal Security",
  "Sociology",
  "Disaster Management"
];
var CategorySchema = z2.enum(VALID_CATEGORIES);
var CATEGORY_ALIASES = {
  polity: "Polity",
  history: "History",
  geography: "Geography",
  economy: "Economy",
  economics: "Economy",
  ethics: "Ethics",
  governance: "Governance",
  ir: "IR",
  "international relations": "IR",
  society: "Society",
  social: "Society",
  "social issues": "Society",
  environment: "Environment",
  ecology: "Environment",
  "environment & ecology": "Environment",
  "environment and ecology": "Environment",
  "science & tech": "Science & Tech",
  "science and tech": "Science & Tech",
  "science & technology": "Science & Tech",
  "science and technology": "Science & Tech",
  science: "Science & Tech",
  technology: "Science & Tech",
  "sci & tech": "Science & Tech",
  "internal security": "Internal Security",
  security: "Internal Security",
  "internal-security": "Internal Security",
  "national security": "Internal Security",
  sociology: "Sociology",
  "sociology & social structure": "Sociology",
  "disaster management": "Disaster Management",
  disaster: "Disaster Management",
  "disaster-management": "Disaster Management",
  dm: "Disaster Management"
};
function normalizeCategory(value) {
  const lower = value.trim().toLowerCase();
  return CATEGORY_ALIASES[lower] ?? value.trim();
}
var FlexibleCategorySchema = z2.preprocess(
  (val) => typeof val === "string" ? normalizeCategory(val) : val,
  CategorySchema
);
var LlmTopicSchema = z2.object({
  title: z2.string().min(1).max(200),
  category: z2.string().describe(
    `Category of the topic. Must be one of: ${VALID_CATEGORIES.join(", ")}`
  ),
  meaning: z2.string().min(1).max(2e3),
  quote: QuoteSchema,
  pros: z2.array(ProConItemSchema).length(4),
  cons: z2.array(ProConItemSchema).length(4),
  wayForward: z2.array(z2.string()).min(3).max(4).describe(
    "Exactly 3 to 4 distinct actionable steps or policy recommendations"
  ),
  conclusion: ConclusionSchema
});
var StructuredTopicSchema = LlmTopicSchema.extend({
  category: FlexibleCategorySchema
});

// src/utils/jsonSchema.ts
var structuredTopicJsonSchema = z3.toJSONSchema(StructuredTopicSchema);
var structuredTopicSchemaString = JSON.stringify(
  structuredTopicJsonSchema,
  null,
  2
);

// src/utils/prompts.ts
var IAS_SYSTEM_PROMPT = `
You are an Expert UPSC/IAS Educator and Public Policy Analyst with encyclopedic knowledge of Indian polity, governance, economics, international relations, and social issues. You specialize in the UPSC Mains answer-writing framework, prioritizing conciseness, institutional backing, balanced analysis, and contemporary relevance.

### TASK
Generate a structured, five-part analytical summary for the requested topic.

### STEP-BY-STEP INSTRUCTIONS

Step 1: Meaning
- Define the core concept precisely in 25-30 words (4-5 lines).
- Focus on academic or administrative accuracy.

Step 2: Quote
- Provide a static, highly relevant quote (maximum 20 words).
- Must be from an established thinker, philosopher, government initiative, constitutional article, or official landmark court judgment.
- Format strictly as: "Quote text" - Source

Step 3: Pros & Cons
- Provide 4 distinct Pros and 4 distinct Cons with unique arguments.
- For EVERY single Pro and Con, provide:
  - title: A concise title (1-4 words).
  - explanation: Brief explanation (maximum 20-25 words).
  - example: A specific real-world example from recent years (maximum 15-20 words).

Step 4: Way Forward
- Suggest 3-4 distinct actionable solutions or next steps as bullet points.
- Each point must be concise (15-20 words).
- Explicitly cite specific reports, schemes, policies, laws, or reforms.

Step 5: Conclusion
- Write a 2-line conclusion (20-25 words total).
- Line 1: State a negative or challenging aspect.
- Line 2: Pivot using words like "But,", "While,", or "However,", and end on a positive note.

### OUTPUT FORMAT (STRICT JSON)

Respond with ONLY a single valid JSON object that conforms to the JSON Schema below \u2014 no markdown, no code fences, no prose outside the JSON.

\`\`\`json
${structuredTopicSchemaString}
\`\`\`

IMPORTANT:
- The category MUST be exactly one of: Polity, History, Geography, Economy, Ethics, Governance, IR, Society, Environment, Science & Tech, Internal Security, Sociology, Disaster Management.
- pros MUST contain exactly 4 items and cons MUST contain exactly 4 items.
- conclusion must be an object with both "negative" and "positive" string keys (never a plain string).
`;
function buildUserPrompt(topic, category, webContext) {
  let prompt = `Topic: ${topic}
`;
  if (category) {
    prompt += `Category: ${category}
`;
  }
  if (webContext && webContext.trim().length > 0) {
    prompt += `
Web Search Results for context:
${webContext}
`;
    prompt += `
Please utilize key facts, recent statistics, and real-world incidents from the web search context above to enrich your Examples, Way Forward, and Quote sections.
`;
  }
  prompt += `
Please generate the complete IAS Study Note as a single strictly-valid JSON object following the exact 5-part rules and JSON schema above.`;
  return prompt;
}

// server/services/apiKeys.ts
import { eq as eq2 } from "drizzle-orm";

// server/utils/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes as randomBytes2 } from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
function getDirname2() {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.url) {
      return path2.dirname(fileURLToPath2(import.meta.url));
    }
  } catch {
  }
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
}
var moduleDir2 = getDirname2();
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 12;
var KEY_LENGTH = 32;
var encryptionKey = null;
function loadEncryptionKey() {
  if (encryptionKey) return encryptionKey;
  const fromEnv = process.env.ENCRYPTION_KEY;
  if (fromEnv) {
    try {
      const decoded = Buffer.from(fromEnv, "base64");
      if (decoded.length === KEY_LENGTH) {
        encryptionKey = decoded;
        return encryptionKey;
      }
      logger.warn(
        `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} base64 chars). Using generated fallback key.`
      );
    } catch {
    }
  }
  const possiblePaths = [
    path2.join(moduleDir2, "../../data/.encryption.key"),
    "/tmp/.encryption.key"
  ];
  for (const keyFile of possiblePaths) {
    try {
      if (fs2.existsSync(keyFile)) {
        encryptionKey = Buffer.from(fs2.readFileSync(keyFile, "utf8"), "base64");
        return encryptionKey;
      }
    } catch {
    }
  }
  const generated = randomBytes2(KEY_LENGTH);
  for (const keyFile of possiblePaths) {
    try {
      fs2.mkdirSync(path2.dirname(keyFile), { recursive: true });
      fs2.writeFileSync(keyFile, generated.toString("base64"), { mode: 384 });
      encryptionKey = generated;
      return encryptionKey;
    } catch {
    }
  }
  encryptionKey = generated;
  return encryptionKey;
}
function encryptSecret(plaintext) {
  const iv = randomBytes2(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, loadEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}
function decryptSecret(payload) {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    loadEncryptionKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

// server/services/apiKeys.ts
function keyId(kind, provider) {
  return `${kind}:${provider}`;
}
async function storeApiKey(kind, provider, value) {
  try {
    const id = keyId(kind, provider);
    const [existing] = await db.select().from(apiKeys).where(eq2(apiKeys.id, id)).limit(1);
    if (existing) {
      await db.update(apiKeys).set({
        encrypted: encryptSecret(value),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq2(apiKeys.id, id));
    } else {
      await db.insert(apiKeys).values({
        id,
        kind,
        provider,
        encrypted: encryptSecret(value),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } catch {
  }
}
async function getApiKey(kind, provider) {
  try {
    const [row] = await db.select().from(apiKeys).where(eq2(apiKeys.id, keyId(kind, provider))).limit(1);
    if (!row) return null;
    return decryptSecret(row.encrypted);
  } catch {
    return null;
  }
}
async function deleteApiKey(kind, provider) {
  try {
    const result = await db.delete(apiKeys).where(eq2(apiKeys.id, keyId(kind, provider)));
    return (result.rowsAffected ?? 1) > 0;
  } catch {
    return false;
  }
}
async function listConfiguredApiKeys() {
  try {
    const rows = await db.select().from(apiKeys);
    const result = { llm: [], search: [] };
    for (const row of rows) {
      if (row.kind === "llm" || row.kind === "search") {
        result[row.kind].push(row.provider);
      }
    }
    return result;
  } catch {
    return { llm: [], search: [] };
  }
}

// server/services/keyResolver.ts
async function resolveLlmApiKey(provider, requestKey) {
  if (requestKey) return requestKey;
  return getApiKey("llm", provider);
}

// server/services/structured.ts
import {
  AIMessage,
  HumanMessage,
  SystemMessage
} from "@langchain/core/messages";

// src/services/llm/langchainProvider.ts
import { ChatOpenAI } from "@langchain/openai";

// src/services/llm/providerDefaults.ts
var PROVIDER_DEFAULTS = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  generalcompute: "https://api.generalcompute.com/v1"
};
var DEFAULT_MAX_TOKENS = 2500;
var DEFAULT_TEMPERATURE = 0.2;

// src/services/llm/langchainProvider.ts
function getLangChainModel(config) {
  const { provider, apiKey, model, baseUrl } = config;
  const baseURL = (baseUrl || PROVIDER_DEFAULTS[provider]).replace(/\/$/, "");
  const defaultHeaders = {};
  if (provider === "openrouter") {
    defaultHeaders["HTTP-Referer"] = "https://ias-black.vercel.app";
    defaultHeaders["X-Title"] = "IAS Study Notes Generator";
  }
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    configuration: { baseURL, defaultHeaders }
  });
}

// server/services/structured.ts
var MAX_STRUCTURED_RETRIES = 2;
var StructuredLLMError = class extends Error {
  lastValidation;
  constructor(message, lastValidation) {
    super(message);
    this.name = "StructuredLLMError";
    this.lastValidation = lastValidation;
  }
};
function toLangChainMessages(messages) {
  return messages.map((m) => {
    if (m.role === "system") {
      return new SystemMessage({ content: m.content });
    }
    if (m.role === "user") {
      return new HumanMessage({ content: m.content });
    }
    return new AIMessage({ content: m.content });
  });
}
async function generateStructuredCompletion(config, schema, messages, options = {}) {
  const maxRetries = options.maxRetries ?? MAX_STRUCTURED_RETRIES;
  const model = getLangChainModel(config);
  const structured = model.withStructuredOutput(schema, {
    name: "ias_topic",
    method: "jsonMode"
  });
  const langMessages = toLangChainMessages(messages);
  let lastError = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.warn({ attempt, maxRetries }, "LLM structured output retry");
    }
    try {
      const object = await structured.invoke(langMessages);
      logger.info({ attempt: attempt + 1 }, "LLM structured output validated");
      return object;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn({ attempt, err: lastError }, "Structured output call failed");
      if (attempt === maxRetries) {
        throw new StructuredLLMError(
          `Failed to get a valid structured response after ${maxRetries} retries: ${lastError}`,
          [lastError]
        );
      }
    }
  }
  throw new StructuredLLMError(
    `Failed to get a valid structured response after ${maxRetries} retries`,
    [lastError]
  );
}

// server/validation/llm.ts
import { z as z4 } from "zod";
var LLMProviderSchema = z4.enum([
  "openrouter",
  "groq",
  "generalcompute"
]);
var LLMMessageSchema = z4.object({
  role: z4.enum(["system", "user", "assistant"]),
  content: z4.string().min(1)
});
var LLMRequestSchema = z4.object({
  provider: LLMProviderSchema,
  apiKey: z4.string().min(1).optional(),
  model: z4.string().min(1),
  messages: z4.array(LLMMessageSchema).min(1),
  temperature: z4.number().min(0).max(2).optional(),
  baseUrl: z4.preprocess(
    (val) => typeof val === "string" && val.trim() === "" ? void 0 : val,
    z4.string().url().optional()
  )
});

// server/routes/generate.ts
var GenerateRequestSchema = z5.object({
  topic: z5.string().min(1).max(200),
  category: CategorySchema.optional(),
  webContext: z5.string().optional(),
  provider: LLMProviderSchema,
  apiKey: z5.string().min(1).optional(),
  model: z5.string().min(1),
  temperature: z5.number().min(0).max(2).optional(),
  baseUrl: z5.preprocess(
    (val) => typeof val === "string" && val.trim() === "" ? void 0 : val,
    z5.string().url().optional()
  ),
  maxRetries: z5.number().int().min(0).max(10).optional()
});
var router2 = Router2();
router2.post("/generate", async (req, res) => {
  const parsed = GenerateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!details[key]) {
        details[key] = [];
      }
      details[key].push(issue.message);
    }
    sendError(res, 400, "Invalid generate request", details);
    return;
  }
  const {
    topic,
    category,
    webContext,
    provider,
    apiKey,
    model,
    baseUrl,
    maxRetries
  } = parsed.data;
  const messages = [
    { role: "system", content: IAS_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserPrompt(topic, category, webContext)
    }
  ];
  try {
    const resolvedApiKey = await resolveLlmApiKey(provider, apiKey);
    if (!resolvedApiKey) {
      sendError(res, 400, "No API key configured for this provider");
      return;
    }
    const structured = await generateStructuredCompletion(
      { provider, apiKey: resolvedApiKey, model, baseUrl },
      LlmTopicSchema,
      messages,
      { maxRetries }
    );
    const validatedTopic = StructuredTopicSchema.parse(structured);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    res.status(200).json({
      topic: {
        ...validatedTopic,
        id: crypto.randomUUID(),
        source: "web",
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (error) {
    const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "Structured topic generation failed";
    logger.error(
      { err: message, retries: maxRetries },
      "Structured topic generation failed"
    );
    sendError(res, 502, message);
  }
});
var generate_default = router2;

// server/routes/llm.ts
import { generateText } from "ai";
import { Router as Router3 } from "express";

// src/services/llm/provider.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
function getLanguageModel(config) {
  const { provider, apiKey, model, baseUrl } = config;
  const url2 = (baseUrl || PROVIDER_DEFAULTS[provider]).replace(/\/$/, "");
  const headers = {};
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://ias-black.vercel.app";
    headers["X-Title"] = "IAS Study Notes Generator";
  }
  const compat = createOpenAICompatible({
    name: provider,
    apiKey,
    baseURL: url2,
    headers
  });
  return compat(model);
}

// server/validation/llm.middleware.ts
var validateLLMRequest = (req, res, next) => {
  const result = LLMRequestSchema.safeParse(req.body);
  if (!result.success) {
    sendValidationError(
      res,
      "Invalid request payload",
      result.error.flatten().fieldErrors
    );
    return;
  }
  req.body = result.data;
  next();
};

// server/routes/llm.ts
var router3 = Router3();
router3.post(
  "/llm",
  validateLLMRequest,
  async (req, res) => {
    try {
      const request = req.body;
      const resolvedApiKey = await resolveLlmApiKey(
        request.provider,
        request.apiKey
      );
      if (!resolvedApiKey) {
        sendError(res, 400, "No API key configured for this provider");
        return;
      }
      logger.info(
        { provider: request.provider, model: request.model },
        "LLM proxy request"
      );
      const model = getLanguageModel({
        provider: request.provider,
        apiKey: resolvedApiKey,
        model: request.model,
        baseUrl: request.baseUrl
      });
      const systemMessage = request.messages.find(
        (m) => m.role === "system"
      )?.content;
      const otherMessages = request.messages.filter(
        (m) => m.role !== "system"
      );
      const result = await generateText({
        model,
        system: systemMessage,
        messages: otherMessages,
        temperature: request.temperature,
        maxOutputTokens: 4e3
      });
      res.status(200).json({ content: result.text });
    } catch (error) {
      let statusCode = 502;
      let message = "Failed to process LLM request";
      if (typeof error === "object" && error !== null) {
        const errObj = error;
        if (typeof errObj.statusCode === "number" && errObj.statusCode >= 400) {
          statusCode = errObj.statusCode;
        } else if (typeof errObj.status === "number" && errObj.status >= 400) {
          statusCode = errObj.status;
        }
        if (errObj.responseBody) {
          try {
            const parsed = JSON.parse(errObj.responseBody);
            if (parsed?.error?.message) {
              message = parsed.error.message;
            } else if (typeof parsed?.error === "string") {
              message = parsed.error;
            } else if (errObj.message) {
              message = errObj.message;
            }
          } catch {
            message = errObj.message || errObj.responseBody;
          }
        } else if (errObj.message) {
          message = errObj.message;
        }
      }
      logger.error(
        { err: message, statusCode },
        "Failed to process LLM request"
      );
      sendError(res, statusCode, message);
    }
  }
);
var llm_default = router3;

// server/routes/models.ts
import { Router as Router4 } from "express";
var router4 = Router4();
async function fetchModels(url2, authHeader, logName) {
  try {
    const headers = {};
    if (authHeader) {
      const key = authHeader.replace(/^Bearer\s+/i, "").trim();
      headers.Authorization = `Bearer ${key}`;
    }
    const response = await fetch(url2, { headers });
    if (!response.ok) {
      logger.warn(
        { status: response.status },
        `${logName} models request failed`
      );
      return {
        status: response.status,
        body: { error: `${logName} API returned ${response.status}` }
      };
    }
    const data = await response.json();
    logger.info(
      {
        count: Array.isArray(data.data) ? data.data.length : void 0
      },
      `${logName} models fetched`
    );
    return { status: 200, body: data };
  } catch (error) {
    const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : `Failed to fetch models from ${logName}`;
    logger.error({ err: message }, `Failed to fetch models from ${logName}`);
    return {
      status: 500,
      body: { error: message }
    };
  }
}
router4.get("/openrouter/models", async (req, res) => {
  const result = await fetchModels(
    "https://openrouter.ai/api/v1/models",
    req.headers.authorization,
    "OpenRouter"
  );
  if (result.status === 200) {
    res.json(result.body);
  } else {
    sendError(res, result.status, result.body.error ?? "Unknown error");
  }
});
router4.get("/generalcompute/models", async (req, res) => {
  const result = await fetchModels(
    "https://api.generalcompute.com/v1/public/models",
    req.headers.authorization,
    "General Compute"
  );
  if (result.status === 200) {
    res.json(result.body);
  } else {
    sendError(res, result.status, result.body.error ?? "Unknown error");
  }
});
var models_default = router4;

// server/routes/search.ts
import { Router as Router5 } from "express";
var router5 = Router5();
var DDG_CACHE_TTL_MS = 5 * 60 * 1e3;
var DDG_CACHE_MAX_ENTRIES = 200;
var ddgCache = /* @__PURE__ */ new Map();
var DDG_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
var DDG_BLOCKED_MARKERS = [
  "are you a robot",
  "captcha",
  "anomaly",
  "check your proxy",
  "privacy warning",
  "please verify you are a human"
];
function isDdgBlocked(html) {
  const sample = html.slice(0, 8192).toLowerCase();
  return DDG_BLOCKED_MARKERS.some((marker) => sample.includes(marker));
}
router5.get("/search/duckduckgo", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    sendError(res, 400, 'Query parameter "q" is required');
    return;
  }
  const cacheKey = `ddg:${query.toLowerCase()}`;
  const cached = ddgCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug({ query, cached: true }, "DuckDuckGo cache hit");
    res.type("text/html").send(cached.html);
    return;
  }
  const url2 = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&ia=web`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1e4);
  let response;
  try {
    response = await fetch(url2, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": DDG_USER_AGENT
      }
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "DuckDuckGo request timed out" : "Failed to fetch from DuckDuckGo";
    logger.error({ err: message, query }, "Failed to fetch from DuckDuckGo");
    sendError(res, 502, message);
    return;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    logger.warn(
      { status: response.status, query },
      "DuckDuckGo returned non-OK status"
    );
    if (response.status === 429 || response.status === 403) {
      sendError(
        res,
        response.status,
        `DuckDuckGo rate-limited (${response.status})`
      );
    } else {
      sendError(res, 502, `DuckDuckGo returned ${response.status}`);
    }
    return;
  }
  const html = await response.text();
  if (isDdgBlocked(html)) {
    logger.warn({ query }, "DuckDuckGo blocked request (anomaly/captcha)");
    sendError(res, 403, "DuckDuckGo blocked the request");
    return;
  }
  if (ddgCache.size >= DDG_CACHE_MAX_ENTRIES) {
    const oldestKey = ddgCache.keys().next().value;
    if (oldestKey !== void 0) {
      ddgCache.delete(oldestKey);
    }
  }
  ddgCache.set(cacheKey, { html, expiresAt: Date.now() + DDG_CACHE_TTL_MS });
  res.type("text/html").send(html);
});
var search_default = router5;

// server/routes/settings.ts
import { Router as Router6 } from "express";
import { z as z6 } from "zod";
var router6 = Router6();
var StoreKeySchema = z6.object({
  kind: z6.enum(["llm", "search"]),
  provider: z6.string().min(1).max(100),
  value: z6.string().min(1)
});
var DeleteKeyParams = z6.object({
  kind: z6.enum(["llm", "search"]),
  provider: z6.string().min(1).max(100)
});
router6.get("/settings/api-keys", async (_req, res) => {
  const configured = await listConfiguredApiKeys();
  res.json({ configured });
});
router6.post(
  "/settings/api-keys",
  async (req, res) => {
    const parsed = StoreKeySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "Invalid API key payload");
      return;
    }
    await storeApiKey(
      parsed.data.kind,
      parsed.data.provider,
      parsed.data.value
    );
    res.status(201).json({ ok: true });
  }
);
router6.delete(
  "/settings/api-keys/:kind/:provider",
  async (req, res) => {
    const parsed = DeleteKeyParams.safeParse({
      kind: req.params.kind,
      provider: req.params.provider
    });
    if (!parsed.success) {
      sendError(res, 400, "Invalid API key path");
      return;
    }
    const deleted = await deleteApiKey(parsed.data.kind, parsed.data.provider);
    if (!deleted) {
      sendNotFound(res, "API key not found");
      return;
    }
    res.json({ ok: true });
  }
);
var settings_default = router6;

// server/routes/stream.ts
import { pipeTextStreamToResponse, streamText } from "ai";
import { Router as Router7 } from "express";
import { z as z7 } from "zod";
var StreamRequestSchema = z7.object({
  topic: z7.string().min(1).max(200),
  category: CategorySchema.optional(),
  webContext: z7.string().optional(),
  provider: LLMProviderSchema,
  apiKey: z7.string().min(1).optional(),
  model: z7.string().min(1),
  temperature: z7.number().min(0).max(2).optional(),
  baseUrl: z7.preprocess(
    (val) => typeof val === "string" && val.trim() === "" ? void 0 : val,
    z7.string().url().optional()
  )
});
var router7 = Router7();
router7.post("/generate/stream", async (req, res) => {
  const parsed = StreamRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!details[key]) {
        details[key] = [];
      }
      details[key].push(issue.message);
    }
    sendError(res, 400, "Invalid stream request", details);
    return;
  }
  const {
    topic,
    category,
    webContext,
    provider,
    apiKey,
    model,
    temperature,
    baseUrl
  } = parsed.data;
  const messages = [
    { role: "system", content: IAS_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserPrompt(topic, category, webContext)
    }
  ];
  try {
    const resolvedApiKey = await resolveLlmApiKey(provider, apiKey);
    if (!resolvedApiKey) {
      sendError(res, 400, "No API key configured for this provider");
      return;
    }
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const otherMessages = messages.filter(
      (m) => m.role !== "system"
    );
    const languageModel = getLanguageModel({
      provider,
      apiKey: resolvedApiKey,
      model,
      baseUrl
    });
    const result = streamText({
      model: languageModel,
      system: systemMessage,
      messages: otherMessages,
      temperature: temperature ?? 0.3,
      onError: ({ error }) => {
        logger.error({ err: String(error) }, "AI SDK stream error");
      }
    });
    await pipeTextStreamToResponse({
      response: res,
      stream: result.textStream
    });
  } catch (error) {
    const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "Streaming failed";
    logger.error({ err: message }, "Stream error");
    if (!res.headersSent) {
      sendError(res, 500, message);
    }
  }
});
var stream_default = router7;

// server/routes/topics.ts
import { Router as Router8 } from "express";
import { z as z8 } from "zod";

// server/services/topics.ts
import fs3 from "node:fs";
import { createRequire as createRequire2 } from "node:module";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { eq as eq3 } from "drizzle-orm";
var customRequire2;
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    customRequire2 = createRequire2(import.meta.url);
  }
} catch {
}
function toTopic(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    meaning: row.meaning,
    quote: { text: row.quoteText, source: row.quoteSource },
    pros: JSON.parse(row.pros),
    cons: JSON.parse(row.cons),
    wayForward: (() => {
      try {
        const parsed = JSON.parse(row.wayForward);
        if (Array.isArray(parsed)) return parsed;
        return [String(parsed)];
      } catch {
        return [row.wayForward];
      }
    })(),
    conclusion: row.conclusionRaw ? row.conclusionRaw : {
      negative: row.conclusionNegative,
      positive: row.conclusionPositive
    },
    source: row.source,
    tags: row.tags ? JSON.parse(row.tags) : void 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
function fromTopic(topic) {
  return {
    id: topic.id,
    title: topic.title,
    category: topic.category,
    meaning: topic.meaning,
    quoteText: topic.quote.text,
    quoteSource: topic.quote.source,
    pros: JSON.stringify(topic.pros),
    cons: JSON.stringify(topic.cons),
    wayForward: JSON.stringify(topic.wayForward),
    conclusionNegative: typeof topic.conclusion === "string" ? "" : topic.conclusion.negative,
    conclusionPositive: typeof topic.conclusion === "string" ? "" : topic.conclusion.positive,
    conclusionRaw: typeof topic.conclusion === "string" ? topic.conclusion : null,
    source: topic.source,
    tags: topic.tags ? JSON.stringify(topic.tags) : null
  };
}
function getSeedTopics() {
  try {
    let moduleDir3 = process.cwd();
    try {
      if (typeof import.meta !== "undefined" && import.meta?.url) {
        moduleDir3 = path3.dirname(fileURLToPath3(import.meta.url));
      } else if (typeof __dirname !== "undefined") {
        moduleDir3 = __dirname;
      }
    } catch {
    }
    const possiblePaths = [
      path3.resolve(moduleDir3, "../../public/data/topics.json"),
      path3.resolve(moduleDir3, "../../dist/data/topics.json"),
      path3.resolve(process.cwd(), "public/data/topics.json"),
      path3.resolve(process.cwd(), "dist/data/topics.json")
    ];
    for (const seedPath of possiblePaths) {
      if (fs3.existsSync(seedPath)) {
        const content = fs3.readFileSync(seedPath, "utf8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
  }
  try {
    if (customRequire2) {
      const required = customRequire2("../../public/data/topics.json");
      if (Array.isArray(required) && required.length > 0) {
        return required;
      }
    }
  } catch {
  }
  return [];
}
async function listTopics() {
  try {
    const rows = await db.select().from(topics);
    if (rows.length === 0) {
      const seeds = getSeedTopics();
      if (seeds.length > 0) return seeds;
    }
    return rows.map(toTopic).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    logger.warn({ err }, "Database query failed, returning seed topics");
    return getSeedTopics();
  }
}
async function getTopic(id) {
  try {
    const [row] = await db.select().from(topics).where(eq3(topics.id, id)).limit(1);
    if (row) return toTopic(row);
  } catch (err) {
    logger.warn({ err, id }, "Database query failed for getTopic");
  }
  const seeds = getSeedTopics();
  return seeds.find((t) => t.id === id) ?? null;
}
async function createTopic(topic) {
  try {
    const row = {
      ...fromTopic(topic),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt
    };
    await db.insert(topics).values(row);
  } catch (err) {
    logger.error({ err }, "Failed to insert topic into DB");
  }
  return topic;
}
async function updateTopic(id, topic) {
  try {
    const row = {
      ...fromTopic(topic),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt
    };
    await db.update(topics).set(row).where(eq3(topics.id, id));
  } catch (err) {
    logger.error({ err }, "Failed to update topic in DB");
  }
  return topic;
}
async function deleteTopic(id) {
  try {
    const result = await db.delete(topics).where(eq3(topics.id, id));
    return (result.rowsAffected ?? 1) > 0;
  } catch (err) {
    logger.error({ err }, "Failed to delete topic from DB");
    return false;
  }
}
async function replaceAllTopics(items) {
  try {
    await db.delete(topics);
    for (const topic of items) {
      const row = {
        ...fromTopic(topic),
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt
      };
      await db.insert(topics).values(row);
    }
  } catch (err) {
    logger.error({ err }, "Failed to replace topics in DB");
  }
}
async function seedIfEmpty() {
  try {
    const count = await db.select({ id: topics.id }).from(topics);
    if (count.length > 0) return;
    const seed = getSeedTopics();
    if (seed.length === 0) return;
    await replaceAllTopics(seed);
    logger.info({ count: seed.length }, "Seeded database with default topics");
  } catch (error) {
    logger.warn({ err: String(error) }, "Database seeding skipped or deferred");
  }
}

// server/routes/topics.ts
var router8 = Router8();
var ProConItemSchema2 = z8.object({
  id: z8.string().optional(),
  title: z8.string(),
  explanation: z8.string(),
  example: z8.string()
});
var TopicSchema = z8.object({
  id: z8.string().min(1),
  title: z8.string().min(1),
  category: CategorySchema,
  meaning: z8.string(),
  quote: z8.object({
    text: z8.string(),
    source: z8.string()
  }),
  pros: z8.array(ProConItemSchema2),
  cons: z8.array(ProConItemSchema2),
  wayForward: z8.array(z8.string()),
  conclusion: z8.union([
    z8.object({
      negative: z8.string(),
      positive: z8.string()
    }),
    z8.string()
  ]),
  source: z8.enum(["local", "web"]),
  tags: z8.array(z8.string()).optional(),
  createdAt: z8.string(),
  updatedAt: z8.string()
});
router8.get("/topics", async (_req, res) => {
  const topics2 = await listTopics();
  res.json({ topics: topics2 });
});
router8.get("/topics/:id", async (req, res) => {
  const topic = await getTopic(String(req.params.id));
  if (!topic) {
    sendNotFound(res, "Topic not found");
    return;
  }
  res.json({ topic });
});
router8.post("/topics", async (req, res) => {
  const parsed = TopicSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Invalid topic payload");
    return;
  }
  const topic = await createTopic(parsed.data);
  res.status(201).json({ topic });
});
router8.put("/topics/:id", async (req, res) => {
  const parsed = TopicSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Invalid topic payload");
    return;
  }
  const existing = await getTopic(String(req.params.id));
  if (!existing) {
    sendNotFound(res, "Topic not found");
    return;
  }
  const topic = await updateTopic(String(req.params.id), parsed.data);
  res.json({ topic });
});
router8.delete("/topics/:id", async (req, res) => {
  const deleted = await deleteTopic(String(req.params.id));
  if (!deleted) {
    sendNotFound(res, "Topic not found");
    return;
  }
  res.json({ ok: true });
});
router8.post("/topics/import", async (req, res) => {
  const body = z8.object({ topics: z8.array(TopicSchema) }).safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "Invalid topics payload");
    return;
  }
  await replaceAllTopics(body.data.topics);
  res.json({ ok: true });
});
var topics_default = router8;

// server/utils/rateLimiter.ts
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
var redisClient = null;
var REDIS_CONNECT_TIMEOUT_MS = 2e3;
async function connectRedis(url2) {
  const client2 = createClient({ url: url2 });
  client2.on("error", (err) => {
    logger.warn({ err: err.message }, "Redis client error");
  });
  try {
    await Promise.race([
      client2.connect(),
      new Promise(
        (_, reject) => setTimeout(
          () => reject(new Error("connection timed out")),
          REDIS_CONNECT_TIMEOUT_MS
        )
      )
    ]);
    logger.info("Rate limiting backed by Redis");
    return client2;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Redis connection failed; falling back to in-memory rate limit"
    );
    try {
      await client2.disconnect();
    } catch {
    }
    return null;
  }
}
async function createApiLimiter(max = process.env.NODE_ENV === "production" ? 100 : 2e3) {
  const windowMs = 15 * 60 * 1e3;
  const base = {
    windowMs,
    max,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
  };
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const client2 = await connectRedis(redisUrl);
    if (client2) {
      redisClient = client2;
      return rateLimit({
        ...base,
        store: new RedisStore({
          sendCommand: (...args) => client2.sendCommand(args)
        })
      });
    }
  }
  return rateLimit(base);
}

// server/app.ts
var app = express();
var NODE_ENV = process.env.NODE_ENV || "development";
app.set("trust proxy", 1);
app.use((req, _res, next) => {
  const matchedPath = req.headers["x-vercel-matched-path"] || req.headers["x-matched-path"] || req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-rewrite-url"];
  if (matchedPath && (req.url === "/" || req.url === "/api" || req.url === "/api/" || req.url === "/index" || req.url === "/api/index")) {
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    req.url = (matchedPath.startsWith("/") ? matchedPath : `/${matchedPath}`) + query;
  } else if ((req.url === "/" || req.url === "/api" || req.url === "/api/" || req.url === "/index" || req.url === "/api/index") && req.headers["x-now-route-matches"]) {
    const routeMatches = req.headers["x-now-route-matches"];
    const match = routeMatches.match(/1=([^&;]+)/);
    if (match?.[1]) {
      const subpath = decodeURIComponent(match[1]);
      const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      req.url = `/api/${subpath}${query}`;
    }
  }
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === "production",
    crossOriginEmbedderPolicy: false
  })
);
var dynamicLimiter = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  max: NODE_ENV === "production" ? 100 : 2e3,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});
void createApiLimiter().then((limiter) => {
  dynamicLimiter = limiter;
}).catch(() => {
});
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  const cookies = {};
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k) {
        try {
          cookies[k] = decodeURIComponent(v.join("="));
        } catch {
          cookies[k] = v.join("=");
        }
      }
    }
  }
  req.cookies = cookies;
  next();
});
app.use(attachAuthUser);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration
      },
      "request completed"
    );
  });
  next();
});
var apiPrefixes = ["/api", "/"];
app.use(apiPrefixes, (req, res, next) => dynamicLimiter(req, res, next));
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
void seedIfEmpty();
app.use(apiPrefixes, models_default);
app.use(apiPrefixes, llm_default);
app.use(apiPrefixes, generate_default);
app.use(apiPrefixes, stream_default);
app.use(apiPrefixes, search_default);
app.use(apiPrefixes, auth_default);
app.use(apiPrefixes, maybeRequireAuth);
app.use(apiPrefixes, topics_default);
app.use(apiPrefixes, settings_default);
app.use(apiPrefixes, (req, res) => {
  logger.warn({ method: req.method, path: req.path }, "API endpoint not found");
  sendNotFound(res, `API endpoint not found: ${req.method} ${req.path}`);
});
app.use(
  (err, req, res, _next) => {
    const message = typeof err === "object" && err !== null && "message" in err ? String(err.message) : void 0;
    logger.error({ err, method: req.method, path: req.path }, "Server error");
    sendServerError(res, message || "Internal server error");
  }
);
var app_default = app;

// server/vercel.ts
var maxDuration = 60;
function handler(req, res) {
  return app_default(req, res);
}
export {
  app_default as app,
  handler as default,
  maxDuration
};
