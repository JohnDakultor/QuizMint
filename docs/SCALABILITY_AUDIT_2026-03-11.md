# Scalability Audit (2026-03-11)

## Scope
Repository-wide operational audit for scaling to very high traffic (target: millions of users), including API, DB, auth/session, AI generation, exports, payments, and telemetry.

## Validation Performed
- `npm run typecheck` ✅ pass
- `npm run lint` ✅ pass with warnings (210 warnings, 0 errors)
- `npm run test:smoke` ✅ 3/3 pass
- Static review of core files:
  - `app/api/generate-quiz/route.ts`
  - `app/api/generate-lesson-plan/route.ts`
  - `app/api/lesson-material-from-file/route.ts`
  - `app/api/analytics/route.ts`
  - `app/api/quiz-share/attempts/route.ts`
  - `lib/auth-option.ts`
  - `lib/abuse-guard.ts`
  - `lib/prisma.ts`
  - `prisma/schema.prisma`
  - `.github/workflows/ci.yml`

## Executive Summary
- Current state is **functional for early-stage production**, but **not ready for true million-user scale**.
- Main blockers are architectural, not syntax/test issues:
  - in-memory throttling/caching in request path,
  - synchronous heavy AI/export work in API routes,
  - DB usage limits not always atomic,
  - overly permissive CSP,
  - high code complexity in large route/page files.

### Readiness Rating
- Product correctness: **B-**
- Operational resilience: **C**
- Million-user readiness: **D+**

## Key Findings (Priority Order)

### P0 (Must Fix Before Large-Scale Traffic)
1. **In-memory burst limiter is not distributed**
- File: `lib/abuse-guard.ts`
- Uses `Map` in-process, so limits reset per instance/redeploy and do not coordinate across nodes.
- Impact: abuse bypass at scale; uneven protection.
- Fix: move to shared store (Upstash Redis or Postgres/pg advisory approach).

2. **Synchronous heavy processing in request/response path**
- Files:
  - `app/api/generate-quiz/route.ts`
  - `app/api/generate-lesson-plan/route.ts`
  - `app/api/lesson-material-from-file/route.ts`
- AI, parsing, RAG, export prep are largely handled in live request path.
- Impact: high p95 latency, timeout risk, poor concurrency during bursts.
- Fix: queue-based async workers (BullMQ/QStash/SQS) + job polling/webhooks.

3. **Usage counter updates are vulnerable to race conditions**
- Example paths update after generation with read-modify-write patterns.
- Impact: incorrect limits under concurrent requests.
- Fix: atomic SQL updates with guard conditions in single transaction.

4. **Security headers are too permissive for production hardening**
- File: `next.config.ts`
- CSP contains `https://*` in multiple directives (`img-src`, `connect-src`, `frame-src`).
- Impact: increased XSS/data exfiltration risk.
- Fix: strict allowlist by provider domain; separate dev/prod CSP profiles.

### P1 (Should Fix for Reliable Growth)
5. **Observability/logging needs structured policy**
- Hot paths still log verbose context via `console.log/warn/error`.
- Impact: noisy logs, privacy risk, costs.
- Fix: structured logger with redaction + env-level log sampling.

6. **Very large files reduce maintainability and raise regression risk**
- `app/(home)/lessonPlan/page.tsx` (~3357 lines)
- `app/(home)/generate-quiz/page.tsx` (~1392 lines)
- `app/api/generate-lesson-plan/route.ts` (~1277+ lines)
- `app/api/generate-quiz/route.ts` (~1100+ lines, includes legacy commented block)
- Fix: split into domain services and route orchestrators.

7. **Test coverage is too shallow for current feature surface**
- Current smoke tests only validate auth gating.
- Missing integration tests for generation, limits, share/timer, exports, payments/webhooks.
- Fix: add API integration matrix + contract tests.

8. **No explicit pagination on several user/admin data APIs**
- Example: `app/api/quiz-share/attempts/route.ts` uses fixed `LIMIT 100`.
- Impact: UX and load issues with long-running accounts.
- Fix: cursor pagination (`createdAt,id`) and explicit filters.

### P2 (Optimization / Future-Proofing)
9. **Generated Prisma client stored in repo output path increases churn**
- Directory: `lib/generated/prisma`
- Impact: diff noise, larger repo footprint.
- Fix: keep generated client out of app source tree and ignore temp binaries.

10. **Analytics route complexity and AI insight latency coupling**
- File: `app/api/analytics/route.ts`
- AI insight generation currently tied to analytics response flow.
- Fix: precompute analytics snapshots + async insight generation with cache.

## Can It Handle Millions of Users Today?
Short answer: **No, not safely.**

It can likely handle **small to medium production load** (e.g., thousands to low tens-of-thousands MAU depending on generation volume), but million-user scale requires architecture changes.

## Target Architecture for Million-User Readiness

### Control Plane
- Next.js app as stateless web/API layer.
- Strict API budget: request handlers should enqueue work quickly and return job IDs.

### Data Plane
- PostgreSQL with:
  - PgBouncer/pooled connections,
  - read replicas for analytics/history,
  - partition strategy for `GenerationEvent` and attempt/event tables.
- Redis for:
  - distributed rate limits,
  - short-lived cache,
  - idempotency keys,
  - queue coordination.

### Async Processing
- Worker tier for:
  - quiz/lesson AI generation,
  - file parsing,
  - export generation,
  - analytics summaries.
- Job states persisted in DB (`queued/processing/completed/failed`) with retries + DLQ.

### Observability
- OpenTelemetry traces + structured logs + metrics dashboard.
- SLOs:
  - API p95 < 500ms (non-generation endpoints)
  - queue start delay p95 < 5s
  - job completion p95 by feature (quiz, lesson, export)
  - error budget by route/class.

## Concrete Remediation Plan

### Phase 1 (1-2 weeks)
- Replace `lib/abuse-guard.ts` with Redis-backed distributed limiter.
- Make free/pro/premium usage updates atomic in DB transactions.
- Remove legacy commented-out code in critical routes.
- Introduce structured logger + redact user PII from logs.
- Tighten CSP (remove wildcards).

### Phase 2 (2-4 weeks)
- Move heavy generation/export routes to queued async jobs.
- Add cursor pagination to submissions/history/admin APIs.
- Add idempotency keys for generation and payment webhooks.
- Add integration tests for:
  - quiz generation
  - lesson generation
  - upload -> deck
  - share/timer/submit constraints
  - webhook signature + replay handling.

### Phase 3 (4-8 weeks)
- Partition/batch archival for `GenerationEvent` and attempt records.
- Introduce read replicas and separate analytics compute.
- Add load testing gates in CI/CD (k6/artillery) with regression thresholds.

## Production Checklist (Go/No-Go)
- [ ] Distributed rate limit enabled in all public and generation routes.
- [ ] Atomic quota updates for all limited features.
- [ ] Heavy tasks moved to queue workers.
- [ ] CSP hardened for production allowlist.
- [ ] Webhook idempotency + signature verification + replay protection.
- [ ] Pagination added for attempts/admin/activity endpoints.
- [ ] Integration test suite for core product flows.
- [ ] Observability dashboard with alerts and SLOs.

## Notes on Current CI
- CI currently runs lint/typecheck/smoke and is useful baseline.
- Add load/perf and integration jobs before claiming large-scale readiness.

## Appendix: Quick Evidence
- API route count: ~68
- App pages: ~42
- Lint warnings: 210 (mainly `any`, hook deps, maintainability indicators)
- Very large files in active path (example):
  - `app/(home)/lessonPlan/page.tsx`
  - `app/(home)/generate-quiz/page.tsx`
  - `app/api/generate-lesson-plan/route.ts`
  - `app/api/generate-quiz/route.ts`
