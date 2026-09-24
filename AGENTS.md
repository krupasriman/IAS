# AGENTS.md — IAS Study Notes Generator

## Quick Start
- **Setup**: `setup.bat` (checks Node 22+, installs deps, creates `.env` from `.env.example`, ensures encryption key)
- **Run both client + server**: `run.bat` → opens two terminals:
  - Client: `npm run dev` (Vite on port 5173)
  - Server: `npm run server:dev` (Express on port 3001, tsx watch)
- **Docker Orchestration**:
  - `docker compose up -d` — starts full production stack (App on 3001, PostgreSQL 16 on 5432, Redis 7 on 6379)
  - `docker compose down` — gracefully stops all containers
- **Individual commands**:
  - `npm run dev` — frontend only (Vite)
  - `npm run server:dev` — backend only (hot reload, `tsx watch`)
  - `npm run build` — compiles client (`dist/`), serverless (`api/index.js`), and standalone server (`dist-server/index.js`)
  - `npm run build:client` — typechecks and builds frontend only
  - `npm run build:server` — bundles serverless and standalone server bundles
  - `npm start` — runs standalone production server (`dist-server/index.js`)
  - `npm run lint` — biome check
  - `npm run lint:fix` — biome check --write
  - `npm test` — vitest run (all unit, eval, and integration tests)
  - `npm run test:watch` — vitest watch mode
  - `npm run test:security` — playwright security probe suite

## Architecture
- **Monorepo**: Single package with dual entrypoints and targets:
  - **Frontend**: `src/main.tsx` → React 19 + Vite + Tailwind CSS v4 + React Router v7
  - **Backend**: `server/index.ts` → Express 5 + TSX (dev) / bundled `dist-server/index.js` (prod standalone)
  - **Serverless**: `server/vercel.ts` → bundled `api/index.js` for Vercel edge/serverless deployments
- **Persistence & Multi-Tenancy**:
  - PostgreSQL (Neon / Supabase / AWS RDS compatible) via **pg** connection pooling + **Drizzle ORM** (`server/db/schema.ts`, `server/db/index.ts`).
  - Multi-tenant data isolation enforced with strict `userId` foreign keys and cascade delete rules.
  - High-performance composite indexes: `topics_user_updated_idx` (`user_id`, `updated_at DESC`) and `topics_user_cat_updated_idx` (`user_id`, `category`, `updated_at DESC`).
  - Keyset cursor-based pagination (`server/services/topics.ts`) for efficient large-library retrieval.
- **Client Offline Storage**:
  - IndexedDB via **idb** (`src/services/storage/idbTopics.ts`) with automatic migration from legacy localStorage.
  - Virtualized DOM rendering via `@tanstack/react-virtual` (`src/pages/AllTopicsPage.tsx`).
- **Shared Code**: `src/utils/`, `src/types/`, `src/services/` imported by both client and server.
- **Path Alias**: `@` → `./src` (configured in `vite.config.ts` and `tsconfig.app.json`).
- **AI Engine & LLM Framework**:
  - **Vercel AI SDK Core** (`generateObject`, `streamObject`, `streamText`) replacing legacy LangChain dependencies.
  - Multi-provider failover router (`server/services/llm/fallbackRouter.ts`) across OpenRouter, Groq, and General Compute.
  - Redis semantic caching (`server/services/cache/llmCache.ts`) with SHA-256 prompt hashing and in-memory dev fallback.
  - Direct SSE Streaming (`server/routes/stream.ts`) on `/api/generate/stream`.
  - Dynamic live model discovery (`server/routes/models.ts`).

## Security & Governance
- **Zero-Trust Multi-Tenancy**: All DB and API queries are strictly scoped to authenticated `userId`. Unauthenticated or foreign tenant requests return 404 (preventing user enumeration).
- **AES-256-GCM Key Vault**:
  - API keys stored encrypted in PostgreSQL (`api_keys` table) using versioned AES-256-GCM payloads (`v1:<iv>:<tag>:<data>`) via `server/utils/crypto.ts`.
  - Zero client-side API secrets: keys are decrypted on-demand server-side via `server/services/keyResolver.ts`.
  - Client API key endpoints (`/api/settings/api-keys`) return sanitized metadata only (`hasKey: true`, provider, truncated ID).
- **CSRF & Session Security**:
  - Session authentication with `httpOnly`, `sameSite=lax`, and `secure` (in production) cookies (`ias_session`).
  - Timing-safe password hashing (`scrypt` with 16-byte random salts).
  - CSRF protection (`server/middleware/csrf.ts`) verifying origin/referer headers on all mutating state requests (`POST`, `PUT`, `DELETE`).
- **Tiered Rate Limiting**:
  - Redis-backed rate limiting (with in-memory fallback) via `server/utils/rateLimiter.ts`:
    - Auth endpoints: 5 req/min (prod)
    - AI Generation endpoints: 10 req/min (prod)
    - General API endpoints: 300 req/15min (prod)

## Observability & Reliability
- **Distributed Tracing**: Node.js `AsyncLocalStorage` context (`server/utils/tracing.ts`) propagating `X-Correlation-ID` across HTTP headers and structured Pino logs (`src/utils/logger.ts`).
- **Prometheus Telemetry**: `prom-client` metrics registry (`server/utils/metrics.ts`) tracking HTTP request counts, response latency histograms, LLM token consumption (prompt/completion), LLM latency, and cache hit/miss rates via `/metrics` and `/api/metrics`.
- **Model Evaluation Harness**: Automated UPSC Mains rubric evaluation harness (`tests/evals/evalHarness.ts`) scoring schema conformance, pros/cons balance, conclusion risk/resolution pivot, and context grounding.

## Containerization & Infrastructure
- **Dockerfile**: Multi-stage production build on Node 22 Alpine:
  - Stage 1 (`builder`): Compiles TypeScript, Vite client, and esbuild backend bundles; prunes devDependencies.
  - Stage 2 (`runner`): Hardened minimal Alpine runtime executing under non-root user `node` (UID 1000) with container healthchecks.
- **Docker Compose**: Preconfigured multi-container stack (`docker-compose.yml`) orchestrating `app`, `postgres:16-alpine`, and `redis:7-alpine`.
- **Runtime Environment Validation**: Fail-fast Zod validation (`server/config/env.ts`) verifying all environment variables at startup before listening on network ports.

## Testing Standards
- **Vitest**: All unit, eval, and integration tests (`npm test`).
  - Integration suite uses `supertest` with correlation header and multi-tenant security verification (`tests/integration/`).
  - Model eval harness runs automated rubric grading (`tests/evals/`).
- **Playwright Security Suite**: Automated black-box penetration tests (`npm run test:security`) verifying DOM secret leaks, source map blocking, overfetching prevention, and sensitive path probing.

## Linting & Formatting
- **Biome** only (no Prettier, no ESLint).
- Config: `biome.json` (Tailwind CSS v4 directives enabled, strict imports).
- Run `npm run lint` or `npm run lint:fix`.

## Common Gotchas
- **Port conflicts**: Vite (5173), Express (3001), PostgreSQL (5432), Redis (6379) — ensure ports are available.
- **Server hot reload**: `tsx watch` restarts on `server/**/*.ts` changes; changes to shared `src/` code require server restart.
- **PowerShell chaining**: In Windows PowerShell, use `;` instead of `&&` when chaining CLI commands.
- **Production Key Requirement**: In `NODE_ENV=production`, `ENCRYPTION_KEY` must be a 32-byte base64 string (44 characters); the server will fail fast at boot if missing.
- **Use extensionless imports** (e.g. `../src/utils/logger`) for TypeScript and bundler/Vercel compatibility.

## File Structure Highlights
```
src/
  components/       # React UI components (virtualized lists, cards, forms)
  pages/            # Route-level views (AllTopicsPage, TopicDetailPage, SettingsPage)
  hooks/            # Custom React hooks (useTopics, useSettings, useWebSearch)
  services/         # Client API clients and storage (idbTopics, search, llm)
  stores/           # Zustand stores (settingsStore)
  utils/            # Shared utilities (logger, validator, parser)
server/
  app.ts            # Express application setup, security middlewares, metrics
  index.ts          # Standalone server entrypoint (serves dist/ assets + /api)
  vercel.ts         # Serverless handler entrypoint
  config/           # Runtime env schema validation (env.ts)
  db/               # PostgreSQL schema & connection pool (schema.ts, index.ts)
  middleware/       # auth.ts, csrf.ts, rbac.ts
  routes/           # auth, topics, settings, llm, generate, stream, models, search
  services/         # fallbackRouter, llmCache, topics, auth, apiKeys, keyResolver
  utils/            # crypto.ts, rateLimiter.ts, metrics.ts, tracing.ts, errors.ts
tests/
  evals/            # UPSC Mains benchmark dataset & rubric eval harness
  integration/      # Supertest integration test suites (auth, topics, metrics)
  security/         # Playwright black-box security and secret-leakage tests
plans/              # Master architecture transformation roadmap (Phases 0-5)
Dockerfile          # Multi-stage production container
docker-compose.yml  # Local turnkey orchestration (App + Postgres 16 + Redis 7)
.env.docker         # Preset container environment variables
```
