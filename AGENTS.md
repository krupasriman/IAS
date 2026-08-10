# AGENTS.md — IAS Study Notes Generator

## Quick Start
- **Setup**: `setup.bat` (installs deps, creates `.env` from `.env.example`)
- **Run both client + server**: `run.bat` → opens two terminals:
  - Client: `npm run dev` (Vite on port 5173)
  - Server: `npm run server:dev` (Express on port 3001, tsx watch)
- **Individual commands**:
  - `npm run dev` — frontend only
  - `npm run server:dev` — backend only (hot reload, `tsx watch`)
  - `npm run build` — `tsc -b && vite build` (typecheck + build)
  - `npm run lint` — biome check
  - `npm run lint:fix` — biome check --write
  - `npm test` — vitest run (all tests)
  - `npm run test:watch` — vitest watch mode

## Architecture
- **Monorepo**: Single package with two entrypoints
  - **Frontend**: `src/main.tsx` → React 19 + Vite + TailwindCSS v4
  - **Backend**: `server/index.ts` → Express 5 + TSX (not compiled, runs via tsx)
- **Persistence**: SQLite via **better-sqlite3** + **Drizzle ORM** (`data/ias.db`, WAL mode). Migrations auto-run at boot from `drizzle/*.sql`; generate new ones with `npx drizzle-kit generate`
- **Shared code**: `src/utils/`, `src/types/`, `src/services/` imported by both client and server
- **Path alias**: `@` → `./src` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Key Commands & Order
- CI order: **lint → test → build** (see `.github/workflows/ci.yml`)
- Run `npm run lint` before `npm run build` locally
- TypeScript project references: `tsconfig.json` references `tsconfig.app.json` + `tsconfig.node.json`
- `data/` is gitignored — DB + dev encryption key never committed

## Testing
- Framework: **vitest** (config in `vite.config.ts`)
- Test files: `*.test.ts` / `*.test.tsx` colocated with source
- Run single test: `npx vitest run src/utils/validator.test.ts`

## Environment
- `.env` required (copy from `.env.example` via `setup.bat`)
- Frontend reads `VITE_*` vars; backend reads `PORT`, `NODE_ENV`, `LOG_LEVEL`
- **`AUTH_MODE`**: `local` (default, no login) or `session` (password login via `/api/auth/login`, httpOnly cookie `ias_session`)
- **`ENCRYPTION_KEY`**: 32-byte base64 key for AES-256-GCM encryption of stored API keys; if unset, a dev key is auto-generated at `data/.encryption.key`
- **`REDIS_URL`**: optional Redis connection string (e.g. `redis://localhost:6379`); when set, `/api/` rate limiting (100 req/15min, `server/utils/rateLimiter.ts`) uses a Redis-backed store, otherwise it falls back to an in-memory store
- Vite dev server proxies `/api/*` → `VITE_API_TARGET` (default `http://localhost:3001`)

## Linting / Formatting
- **Biome** only (no Prettier, no ESLint, no oxlint)
- Config: `biome.json` (TailwindCSS v4 directives enabled)
- `biome check` includes formatting + import organization

## Notable Conventions
- **Server imports client code directly** via relative paths (e.g., `../src/utils/logger.ts`) — works because server runs via `tsx`
- **No separate server build** — `tsx` executes TypeScript directly in dev; `npm run build` only builds frontend
- **Zod** for validation (shared schemas in `src/utils/validator.ts`, `server/validation/llm.ts`)
- **pino** for structured logging (configured in `src/utils/logger.ts`)
- **React 19** + **React Router v7** (data router mode)
- **API keys**: `src/stores/settingsStore.ts` keeps keys in localStorage and syncs to the server; server stores them encrypted (AES-256-GCM, `server/utils/crypto.ts`). LLM routes accept an optional `apiKey` and fall back to the encrypted store via `resolveLlmApiKey`
- **Topics**: `src/hooks/useTopics.ts` loads server-first, falls back to localStorage/seed file; `server/services/topics.ts` seeds from `public/data/topics.json` on empty DB

## Common Gotchas
- Port conflicts: Vite (5173) + Express (3001) — ensure both free
- Server hot reload: `tsx watch` restarts on `server/**/*.ts` changes; changes to `src/` shared code require server restart
- Shared imports from `src/` in server use `.ts` extensions (required by tsx)
- CI uses Node 22; ensure local version matches
- better-sqlite3 is a native module — new installs may require `npm approve-scripts better-sqlite3`

## File Structure Highlights
```
src/
  components/       # React components
  pages/            # Route-level pages
  hooks/            # Custom React hooks (useTopics, useSettings)
  utils/            # Shared utilities (validator, parser, prompts, logger)
  services/         # API clients (LLM, search, topicsApi, settingsApi)
  stores/           # Zustand stores (settingsStore)
  types/            # Shared TypeScript types
  config/           # Provider configs
server/
  index.ts          # Express entrypoint
  routes/           # API routes (auth, topics, settings, llm, generate, stream, models, search)
  services/         # Server-only services (topics, apiKeys, auth, keyResolver)
  db/               # Drizzle schema + client (schema.ts, index.ts)
  middleware/       # attachAuthUser, maybeRequireAuth
  validation/       # Zod schemas for API
  utils/            # crypto.ts (AES-256-GCM), errors.ts (standardized responses)
drizzle/            # SQL migration files (auto-run at boot)
data/               # SQLite DB + dev encryption key (gitignored)
```
