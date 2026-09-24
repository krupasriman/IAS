# IAS Study Notes Generator

[![CI/CD Pipeline](https://github.com/krupasriman/IAS/actions/workflows/ci.yml/badge.svg)](https://github.com/krupasriman/IAS/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: 22+](https://img.shields.io/badge/node-22%2B-brightgreen.svg)](https://nodejs.org/)

An enterprise-grade, AI-powered UPSC Mains study notes generator and revision library built with **React 19**, **Express 5**, **Vercel AI SDK Core**, **PostgreSQL**, and **Redis**.

---

## Key Capabilities

### 1. Structured UPSC Mains Pedagogical Engine
- **Analytical 5-Part Note Architecture**: Generates notes aligned with UPSC Mains evaluation criteria:
  1. *Context & Meaning* (core definition & historical background)
  2. *Relevance & Quote* (constitutional articles, commission reports, or thinker quotes)
  3. *Balanced Dimensions* ($\ge 4$ Arguments in Favor / Pros with real-world case studies & $\ge 4$ Critical Challenges / Cons)
  4. *Actionable Way Forward* (3-4 policy recommendations grounded in administrative best practices)
  5. *Balanced Conclusion Pivot* (identifies systemic risks while proposing forward-looking resolutions)
- **Few-Shot Exemplars**: Ingests high-scoring Mains topper answers to maintain analytical tone and precision.

### 2. High-Performance AI Engine & Routing
- **Vercel AI SDK Core**: Direct integration with `streamObject` and `generateObject` for type-safe structured generation.
- **Multi-Provider Failover Router**: Auto-routes across **OpenRouter**, **Groq**, and **General Compute** with deterministic fallbacks.
- **Redis Semantic Caching**: SHA-256 prompt hashing and TTL caching to prevent duplicate token costs and provide sub-second responses.
- **Live Token SSE Streaming**: Direct Server-Sent Events (`/api/generate/stream`) for real-time note streaming.
- **Real-Time Web Search Grounding**: DuckDuckGo, Brave, SerpAPI, Tavily, and LangSearch integrations for factual citations.

### 3. Scalable Concurrency & Offline Architecture
- **PostgreSQL Connection Pooling**: Native Neon / Supabase / AWS RDS concurrency using `pg` pooling and Drizzle ORM.
- **Multi-Tenant Data Isolation**: Strict user-scoped querying with composite indexes (`(user_id, updated_at DESC)` and `(user_id, category, updated_at DESC)`).
- **Keyset Cursor Pagination**: Constant-time queries for expansive library collections.
- **Offline PWA & IndexedDB**: Client storage backed by IndexedDB (`idb`) with automatic migration from localStorage.
- **Virtualized Rendering**: High-performance UI rendering of thousands of topics via `@tanstack/react-virtual`.

### 4. Zero-Trust Security & Key Vault
- **AES-256-GCM Key Vault**: Encrypted server-side storage of user API keys with versioned payloads (`v1:<iv>:<tag>:<data>`).
- **Zero Client-Side Secrets**: Browser clients never receive or store plaintext keys; decryption occurs strictly in server runtime.
- **CSRF & Session Protection**: HTTP-only session cookies with timing-safe scrypt password hashing and CSRF validation on mutating operations.
- **Tiered Rate Limiting**: Redis-backed limits for authentication (5 req/min), AI generation (10 req/min), and general APIs (300 req/15min).

### 5. Production Observability & Model Evaluation
- **Distributed Correlation Tracing**: Node.js `AsyncLocalStorage` propagating `X-Correlation-ID` across HTTP requests and Pino logs.
- **Prometheus Metrics Registry**: Native `/metrics` and `/api/metrics` scraping tracking request rates, latencies, token consumption, and cache hits.
- **UPSC Rubric Eval Harness**: Automated benchmark suite (`tests/evals/`) scoring schema conformance, pros/cons balance, conclusion pivots, and factual context grounding.
- **Playwright Security Suite**: Automated black-box tests preventing secret leaks, directory traversal, and source map leakage.

---

## Getting Started

### Prerequisites
- **Node.js**: `v22.0.0` or higher
- **PostgreSQL** (Local instance, Neon, Supabase, or Docker)
- **Redis** (Optional for local dev, recommended for production caching)

### Option 1: Turnkey Local Development (Windows)
```cmd
:: 1. Run the interactive setup (installs deps, validates Node, creates .env, sets encryption key)
setup.bat

:: 2. Launch both Vite frontend (port 5173) and Express backend (port 3001)
run.bat
```

### Option 2: Docker Compose (All Platforms)
Launch the complete stack (App + PostgreSQL 16 + Redis 7) with a single command:
```bash
# Start all containers in the background
docker compose up -d

# Verify app health
curl http://localhost:3001/api/health

# View container logs
docker compose logs -f app

# Gracefully stop the stack
docker compose down
```

### Option 3: Manual Startup
```bash
# Install dependencies
npm ci

# Configure environment
cp .env.example .env

# Run Vite frontend (http://localhost:5173)
npm run dev

# Run Express backend with hot reload (http://localhost:3001)
npm run server:dev
```

---

## Production Deployment

### Standalone Node.js Container / VM
```bash
# Typecheck client, build Vite assets, bundle serverless and standalone server
npm run build

# Start the standalone server (serves both UI and /api endpoints on port 3001)
npm start
```

### Vercel Serverless
The repository includes native Vercel configuration (`vercel.json` and `api/index.js`). Deploy directly with:
```bash
vercel deploy --prod
```

---

## Quality Assurance & Verification Commands

```bash
# 1. Lint and format validation (Biome)
npm run lint

# 2. Automated format fix
npm run lint:fix

# 3. Unit, Model Evaluation & Supertest Integration test suite
npm test

# 4. Playwright black-box security test suite
npm run test:security

# 5. Production multi-target build verification
npm run build

# 6. Dependency vulnerability security audit
npm audit --audit-level=critical
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Zustand 5, React Router v7, TanStack Virtual, IDB (IndexedDB), Lucide Icons |
| **Backend** | Express 5, TSX, Vercel AI SDK Core (`ai`), Drizzle ORM, `pg` Connection Pool, Redis 7, Pino Structured Logger |
| **Security** | AES-256-GCM, Scrypt Password Hashing, CSRF Protection, Helmet, Tiered Rate Limiting |
| **Observability** | Node.js `AsyncLocalStorage`, Prometheus (`prom-client`), Custom UPSC Mains Evaluation Harness |
| **DevOps & Infra** | Multi-Stage Alpine Dockerfile, Docker Compose, GitHub Actions CI/CD |
| **Tooling** | Biome, Vitest, Playwright, esbuild |

---

## Architecture Blueprints & Plans
For technical architecture details and phased implementation history, refer to:
- [`AGENTS.md`](./AGENTS.md) — Agent operating manual, architectural conventions & rules
- [`plans/README.md`](./plans/README.md) — Phased enterprise transformation blueprints (Phases 0–5)
- [`Dockerfile`](./Dockerfile) & [`docker-compose.yml`](./docker-compose.yml) — Production container orchestration