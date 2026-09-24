# Phase 4: Production Observability, Reliability & Model Governance

## 1. Executive Summary & Goals
Phase 4 equips the system with enterprise observability and automated quality assurance. In production AI systems, silent failures (hallucinations, schema drift, token cost spikes, upstream latency degradations) can go unnoticed without proper telemetry. We implement OpenTelemetry distributed tracing, Prometheus metrics for LLM token usage and costs, an automated Model Evaluation (Eval) test harness, and comprehensive backend API integration tests.

---

## 2. Target Observability Architecture

```mermaid
flowchart TD
    subgraph Ingress["Ingress Request"]
        Req[HTTP Request] --> CorrID[Inject X-Correlation-ID & AsyncLocalStorage Context]
    end

    subgraph ServiceInstrumentation["OpenTelemetry & Structured APM"]
        CorrID --> TraceSpan[Start OTel Span]
        TraceSpan --> PinoLog[Structured Pino Log with trace_id]
        TraceSpan --> LLMSpan[LLM Inference Span]
        LLMSpan --> TokenMetrics[Prometheus Metric Collector]
    end

    subgraph MetricsExport["Telemetry Dashboards"]
        TokenMetrics --> Prom[/metrics Endpoint]
        Prom --> Grafana[Grafana / Datadog: Cost & Latency Dashboard]
    end

    subgraph EvalGovernance["Model Governance (Offline & CI)"]
        BenchmarkDataset[UPSC Benchmark Dataset] --> EvalRunner[Eval Harness]
        EvalRunner --> RubricCheck[Rubric Adherence: 4 Pros, 4 Cons, 2-line Conclusion]
        EvalRunner --> HallucinationCheck[Hallucination Check vs Retrieved Context]
    end
```

---

## 3. Concrete Implementation Milestones

### 4.1 Request Correlation & OpenTelemetry Tracing
* **Problem:** When an LLM request hangs or fails, tracing the issue across server logs, web search, and upstream provider calls is impossible without unified trace IDs.
* **Action:**
  - Create `server/utils/tracing.ts` with `AsyncLocalStorage` storing `{ correlationId, userId, traceId }`.
  - Update `server/utils/logger.ts` to automatically append `correlationId` to every log entry.
  - Add request header middleware propagating `X-Correlation-ID`.

### 4.2 Prometheus Metrics & LLM Cost Telemetry
* **Problem:** There is no visibility into how many tokens the application consumes, how much it costs per user/day, or what p95 generation latencies are.
* **Action:**
  - Create `server/utils/metrics.ts` using `prom-client`.
  - Record:
    - `ias_llm_tokens_total{provider, model, type="prompt|completion"}`
    - `ias_llm_duration_seconds{provider, model, status}`
    - `ias_llm_cost_estimated_usd{provider, model}`
    - `ias_cache_hits_total{type="topic|search"}`
  - Expose protected `/metrics` endpoint for Prometheus scraping.

### 4.3 Automated Model Evaluation Pipeline (Eval Suite)
* **Problem:** Switching LLM models or editing system prompts can silently degrade UPSC answer quality or break formatting rules.
* **Action:**
  - Create `tests/evals/evalHarness.ts` with 10 representative UPSC Mains topics.
  - Score generated outputs automatically on:
    1. **Strict Structure Conformity:** 100% Zod validation pass.
    2. **Rubric Balance:** Exactly 4 pros and 4 cons with non-empty examples.
    3. **Conclusion Pivot:** Negative aspect $\rightarrow$ positive transition pivot.
    4. **Context Grounding:** Verification that facts from `<retrieved_context>` appear in Examples/Way Forward without hallucination.

### 4.4 Supertest Backend Integration Suite
* **Problem:** Tests currently only check utility functions; there are zero tests verifying Express router status codes, auth enforcement, or database transactions.
* **Action:**
  - Install `supertest` and `@types/supertest`.
  - Create integration tests:
    - `tests/integration/auth.test.ts`: Login, registration, session cookies.
    - `tests/integration/topics.test.ts`: Multi-tenant CRUD, ensuring User A cannot read or delete User B's topics.
    - `tests/integration/stream.test.ts`: Validating SSE event frames and error handling.

---

## 4. Detailed Task Checklist

- [x] Implement `AsyncLocalStorage` correlation ID tracking in `server/utils/tracing.ts`.
- [x] Connect correlation IDs to `src/utils/logger.ts`.
- [x] Install `prom-client` and create `server/utils/metrics.ts`.
- [x] Add `/metrics` endpoint to `server/app.ts`.
- [x] Instrument `/api/generate` and `/api/generate/stream` with token usage and duration metrics.
- [x] Create `tests/evals/evalHarness.ts` with benchmark UPSC rubric scoring.
- [x] Install `supertest` and write backend route integration tests.
- [x] Add multi-tenant data boundary test verifying user isolation.
- [x] Verify `npm test` runs both unit and integration suites cleanly.

---

## 5. Verification Commands
```bash
# 1. Run all unit and integration tests
npm test

# 2. Run model eval suite
npx tsx tests/evals/evalHarness.ts

# 3. Verify metrics endpoint
curl http://localhost:3001/metrics
```
