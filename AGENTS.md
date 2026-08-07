# AGENTS.md — IAS Study Notes Generator

## Quick Start
- **Setup**: `setup.bat` (installs deps, creates `.env` from `.env.example`)
- **Run both client + server**: `run.bat` → opens two terminals:
  - Client: `npm run dev` (Vite on port 5173)
  - Server: `npm run server:dev` (Express on port 3001, tsx + nodemon)
- **Individual commands**:
  - `npm run dev` — frontend only
  - `npm run server:dev` — backend only (hot reload)
  - `npm run build` — `tsc -b && vite build` (typecheck + build)
  - `npm run lint` — oxlint
  - `npm test` — vitest run (all tests)
  - `npm run test:watch` — vitest watch mode

## Architecture
- **Monorepo**: Single package with two entrypoints
  - **Frontend**: `src/main.tsx` → React 19 + Vite + TailwindCSS v4
  - **Backend**: `server/index.ts` → Express 5 + TSX (not compiled, runs via tsx)
- **Shared code**: `src/utils/`, `src/types/`, `src/services/` imported by both client and server
- **Path alias**: `@` → `./src` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Key Commands & Order
- CI order: **lint → test → build** (see `.github/workflows/ci.yml`)
- Run `npm run lint` before `npm run build` locally
- TypeScript project references: `tsconfig.json` references `tsconfig.app.json` + `tsconfig.node.json`

## Testing
- Framework: **vitest** (config in `vite.config.ts`)
- Test files: `*.test.ts` / `*.test.tsx` colocated with source
- Run single test: `npx vitest run src/utils/validator.test.ts`

## Environment
- `.env` required (copy from `.env.example` via `setup.bat`)
- Frontend reads `VITE_*` vars; backend reads `PORT`, `NODE_ENV`, `LOG_LEVEL`
- Vite dev server proxies `/api/*` → `VITE_API_TARGET` (default `http://localhost:3001`)

## Linting / Formatting
- **oxlint** only (no Prettier, no ESLint)
- Config: `.oxlintrc.json` with React + TypeScript plugins
- Rules: `react/rules-of-hooks` = error, `react/only-export-components` = warn

## Notable Conventions
- **Server imports client code directly** via relative paths (e.g., `../src/utils/logger.ts`) — works because server runs via `tsx`
- **No separate server build** — `tsx` executes TypeScript directly in dev; `npm run build` only builds frontend
- **Zod** for validation (shared schemas in `src/utils/validator.ts`, `server/validation/llm.ts`)
- **pino** for structured logging (configured in `src/utils/logger.ts`)
- **React 19** + **React Router v7** (data router mode)

## Common Gotchas
- Port conflicts: Vite (5173) + Express (3001) — ensure both free
- Server hot reload: `nodemon` watches `server/**/*.ts` — changes to `src/` require server restart
- Shared imports from `src/` in server use `.ts` extensions (required by tsx)
- CI uses Node 22; ensure local version matches

## File Structure Highlights
```
src/
  components/       # React components
  pages/            # Route-level pages
  hooks/            # Custom React hooks
  utils/            # Shared utilities (validator, parser, prompts, logger)
  services/         # API clients (LLM, search)
  types/            # Shared TypeScript types
  config/           # Provider configs
server/
  index.ts          # Express entrypoint
  routes/           # API routes (llm, models)
  services/         # Server-only services
  validation/       # Zod schemas for API
  utils/errors.ts   # Standardized error responses
```