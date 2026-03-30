---
title: MVP-B1 Claim-To-Evidence Traceability Matrix
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-30
planning_type: review
---

# MVP-B1 Claim-To-Evidence Traceability Matrix

## Purpose

Provide the backend MVP operability claim-to-proof map requested by `MVP-B1`:
each claim is tied to concrete repository evidence and at least one executable
validation command.

## Scope

Claims come from:

- [MVP Backend Operability Baseline Roadmap](../proposals/mvp-backend-operability-baseline-roadmap-20260329.md)
- [Backend MVP Control-Plane Runbook](../../runbooks/backend-mvp-control-plane-runbook-20260329.md)

This matrix does not expand runtime behavior. It only traces currently claimed
MVP capability.

## Matrix

| Capability claim                                                                                           | Proof source (docs)                                                  | Code evidence                                                                                        | Test evidence                                                                                                                                                                      | Executable command                                                     |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Protected runtime route surface exists (`/runs*` control-plane)                                            | Roadmap IN scope, Runbook MVP Surface                                | `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`, `apps/api/src/app.ts`                    | `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                   | `pnpm --filter dvt-api test:integration`                               |
| `POST /runs/start` is available in protected path                                                          | Roadmap IN scope, Runbook MVP Surface                                | `apps/api/src/app.ts`                                                                                | `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                   | `pnpm --filter dvt-api test:integration`                               |
| Query endpoints exist and are protected (`GET /runs`, `GET /runs/:runId`, `GET /runs/:runId/events`)       | Roadmap IN scope, Runbook MVP Surface                                | `apps/api/src/app.ts`                                                                                | `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                   | `pnpm --filter dvt-api test:integration`                               |
| Signal and cancel operations are operation-scoped (`POST /runs/:runId/signal`, `POST /runs/:runId/cancel`) | Roadmap IN scope, Runbook auth matrix                                | `apps/api/src/entrypoints/http/signalRunRoute.ts`, `apps/api/src/entrypoints/http/cancelRunRoute.ts` | `apps/api/test/entrypoints/http/signalRunRoute.test.ts`, `apps/api/test/entrypoints/http/cancelRunRoute.test.ts`, `apps/api/test/integration/protectedRuntime.integration.test.ts` | `pnpm --filter dvt-api test && pnpm --filter dvt-api test:integration` |
| Health endpoint is always available (`GET /healthz`)                                                       | Roadmap IN scope, Runbook MVP Surface                                | `apps/api/src/routes/health.ts`                                                                      | `apps/api/test/app.test.ts`                                                                                                                                                        | `pnpm --filter dvt-api test`                                           |
| Readiness endpoint is conditional (`GET /readyz` only when `DVT_READYZ_ENABLED=true`)                      | Roadmap IN scope, Runbook MVP Surface                                | `apps/api/src/routes/healthReadinessPolicy.ts`, `apps/api/src/routes/health.ts`                      | `apps/api/test/app.test.ts`                                                                                                                                                        | `pnpm --filter dvt-api test`                                           |
| Protected runtime routes are OIDC + tenant gated                                                           | Roadmap MVP Definition, Runbook Required Environment Posture         | `apps/api/src/modules/buildProtectedRuntimeModule.ts`                                                | `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                   | `pnpm --filter dvt-api test:integration`                               |
| Run state/event queryability supports operator diagnosis                                                   | Roadmap MVP Definition, Runbook Daily Operations and Diagnosis Guide | `apps/api/src/app.ts`, `apps/api/src/routes/health.ts`                                               | `apps/api/test/integration/protectedRuntime.integration.test.ts`, `apps/api/test/app.test.ts`                                                                                      | `pnpm --filter dvt-api test && pnpm --filter dvt-api test:integration` |

## Coverage Check Against MVP Roadmap "IN" Claims

The roadmap `IN` set contains nine scope items (six protected runtime routes,
two operational endpoints, one auth posture claim). This matrix covers each of
them through route-level and posture-level rows:

- protected command/query routes: covered by rows 1-4
- public operational routes (`/healthz`, `/readyz`): covered by rows 5-6
- OIDC + tenant authorization posture: covered by row 7
- operator diagnosis through run/event queryability: covered by row 8

No `IN` claim from the roadmap is left without evidence + executable command.

## Baseline Command Set

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm verify:prepush
```

## Constraints

- This matrix is `MVP-B1` delivery evidence but remains provisional until
  dependency `MVP-A1` (canonical MVP contractual inventory) is accepted.
- `MVP-A1` source doc is currently `Proposed`; therefore `MVP-B1` cannot be
  marked `done` yet, only `review` with provisional closure evidence.
- If `MVP-A1` changes claim boundaries, this matrix must be updated in the same
  PR that changes those claims.
