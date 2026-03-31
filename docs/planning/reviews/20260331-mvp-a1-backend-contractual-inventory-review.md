---
title: MVP-A1 Backend Contractual Inventory Review
status: Review
owner: Architecture / API / Docs
last_reviewed: 2026-03-31
planning_type: review
---

# MVP-A1 Backend Contractual Inventory Review

## Purpose

Verify that the `MVP-A1` contractual inventory matches the real `apps/api`
runtime surface and freezes only the backend MVP control-plane already shipped
and testable.

## Scope

This review is code-grounded only. It does not add runtime behavior, new
routes, or new authorization semantics.

## Verification

### 1. Route surface

- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts` defines exactly
  six protected runtime routes under `/runs*`.
- `apps/api/src/app.ts` wires those six routes only after the protected runtime
  module is built.
- `apps/api/src/routes/health.ts` exposes `/healthz` always and `/readyz` only
  when `DVT_READYZ_ENABLED=true`.
- `apps/api/src/app.ts` also wires `/version`, `/db/ready`, and optional admin
  routes, but those surfaces remain outside the MVP roadmap `IN` set and are
  therefore excluded from `MVP-A1`.

### 2. Activation boundary

- `apps/api/src/app.ts` builds the protected runtime only when
  `OIDC_JWKS_URI`, `OIDC_ISSUER`, and `OIDC_AUDIENCE` are all present.
- `apps/api/src/modules/buildProtectedRuntimeModule.ts` requires
  `DATABASE_URL` and throws if OIDC posture is complete but database posture is
  not.
- `apps/api/test/app.test.ts` covers the fast-fail path when OIDC is enabled
  without `DATABASE_URL`.
- `apps/api/test/integration/protectedRuntime.integration.test.ts` exercises
  the protected runtime against real JWKS-backed OIDC verification and live
  PostgreSQL when environment posture is available.

### 3. Authorization matrix

- `apps/api/src/entrypoints/http/signalRunRouteParser.ts` maps
  `PAUSE`/`RESUME` to `run:signal` and `CANCEL` to `run:cancel`.
- `apps/api/src/entrypoints/http/cancelRunRouteParser.ts` binds
  `POST /runs/:runId/cancel` directly to `run:cancel`.
- `apps/api/test/integration/protectedRuntime.integration.test.ts` verifies
  negative authorization paths for missing `run:signal` and `run:cancel`
  grants.

### 4. Input and scope invariants

- Protected runtime requests require bearer auth and tenant-scoped request
  context before use-case execution.
- Query paths require `tenantId` in request parsing.
- Command parsers validate `runId`, `tenantId`, and request body shape before
  command execution.
- `DVT_SIGNAL_ROUTE_ALLOW_CANCEL` remains the governing compatibility switch
  for `CANCEL` through `/runs/:runId/signal`, as exercised in
  `apps/api/test/app.test.ts`.

## Review Outcome

- No drift was found between the `MVP-A1` inventory and the real runtime
  sources audited in this review.
- The proposal-backed inventory is stable enough to close `MVP-A1` without
  widening the MVP.
- `MVP-B1`, `MVP-C1`, and `MVP-D1` can close against this frozen baseline.
- `MVP-E1` is unblocked by the now-stable backend MVP surface but remains
  queued until the frontend contract artifact is written.
- `R-20260329-MVP-BACKEND-SCOPE-DRIFT-01` remains open for stability
  monitoring and anti-drift governance beyond this acceptance step.
