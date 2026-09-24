# Phase 2: Security, Multi-Tenancy & Key Management

## 1. Executive Summary & Goals
Phase 2 hardens the platform against secret leaks, unauthorized cross-tenant data access, and session hijacking. We eliminate client-side search API keys by moving all external search executions to a backend broker, implement key-versioned AES-256-GCM encryption with strict production guards, introduce user registration with Role-Based Access Control (RBAC), and secure browser cookies.

---

## 2. Target Security Architecture

```mermaid
flowchart TD
    subgraph BrowserClient["Browser Client (Untrusted)"]
        UI[React UI]
        NoKeys[Zero Secrets Stored in LocalStorage]
    end

    subgraph APIBoundary["API Gateway & Auth Boundary"]
        CSRF[CSRF Validation & Secure Cookies]
        AuthMW[Session Middleware -> req.authUser (id, role)]
        RBAC[RBAC Guard: requireRole('admin' | 'user')]
    end

    subgraph BackendServices["Backend Trusted Services"]
        SearchBroker[Server-Side Web Search Broker]
        Vault[Key Vault: v1:iv:tag:data (AES-256-GCM)]
        TopicSvc[Tenant-Scoped Topic Service]
    end

    subgraph ExternalServices["External Providers"]
        Tavily[Tavily API]
        Brave[Brave Search API]
        PG[(PostgreSQL with user_id Foreign Keys)]
    end

    UI -->|HTTPS + HttpOnly Session Cookie| CSRF
    CSRF --> AuthMW
    AuthMW --> RBAC
    RBAC --> SearchBroker
    RBAC --> TopicSvc
    SearchBroker -->|Server Secrets from Vault| Tavily
    SearchBroker -->|Server Secrets from Vault| Brave
    TopicSvc -->|where user_id = req.authUser.id| PG
```

---

## 3. Concrete Implementation Milestones

### 2.1 Server-Side Web Search Broker (Zero Client Secrets)
* **Problem:** In `src/services/search/index.ts`, the browser makes direct `fetch()` calls to third-party search engines (Tavily, Brave, SerpAPI, LangSearch) using API keys saved in browser `localStorage`.
* **Action:**
  - Create unified server route: `POST /api/search` accepting `{ query, provider, maxResults }`.
  - Move API key storage for search engines into the server's encrypted `api_keys` table.
  - Remove all client search API keys and direct third-party fetch calls from `src/services/search/`.
  - Frontend only calls `POST /api/search`, receiving clean, parsed search result items.

### 2.2 Key Vault Hardening & Key Versioning
* **Problem:** `server/utils/crypto.ts` generates ephemeral encryption keys in memory or `/tmp` if `ENCRYPTION_KEY` is unset. In production, this causes permanent data loss across container restarts.
* **Action:**
  - Add strict production check: Throw `FatalError: ENCRYPTION_KEY must be provided in production` on boot.
  - Implement version prefixing for encrypted payloads: `v1:<iv>:<tag>:<ciphertext>`.
  - Enable future key rotation without breaking existing encrypted data.

### 2.3 User Registration & RBAC
* **Problem:** There is currently no endpoint to create new users; users must be manually added to the DB.
* **Action:**
  - Add `POST /api/auth/register` with password strength validation (minimum 8 characters, mixed case, numbers).
  - Add RBAC middleware `server/middleware/rbac.ts`:
    - `requireRole("admin")`: For system settings, global metrics, and user management.
    - `requireRole("user")`: For personal notes, search, and generation.
  - Add user profile endpoint `GET /api/auth/profile`.

### 2.4 Session Security & CSRF Defense
* **Problem:** Session cookies lack the `Secure` flag in production and are vulnerable to cross-site request exploitation.
* **Action:**
  - Configure session cookie flags: `HttpOnly; Path=/; SameSite=Lax; Secure` (when `NODE_ENV === "production"`).
  - Enforce custom header validation (`X-Requested-With: XMLHttpRequest` or `X-IAS-Client: web`) on all mutating requests (`POST`, `PUT`, `DELETE`) to block simple cross-origin CSRF attacks.

---

## 4. Detailed Task Checklist

- [x] Create `server/routes/searchBroker.ts` handling all third-party search execution.
- [x] Refactor `src/services/search/index.ts` to call `/api/search` without client API keys.
- [x] Remove search API key fields from client `src/stores/settingsStore.ts`.
- [x] Add versioned encryption (`v1:iv:tag:data`) and production guard in `server/utils/crypto.ts`.
- [x] Implement `POST /api/auth/register` with Zod validation in `server/routes/auth.ts`.
- [x] Create `server/middleware/rbac.ts` with `requireRole` helper.
- [x] Enforce `Secure` cookie flag in production and add custom-header CSRF guard.
- [x] Run security test: `npm run test:security` (Playwright secret check).

---

## 5. Verification Commands
```bash
# 1. Lint check
npm run lint

# 2. Run security suite (Playwright secret detection)
npm run test:security

# 3. Unit tests
npm test
```
