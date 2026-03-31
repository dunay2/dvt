---
title: MVP-B1 Claim-To-Evidence Traceability Matrix
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
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

- `MVP-A1` is now locked by the reviewed proposal
  `docs/planning/proposals/mvp-a1-backend-contractual-inventory-20260329.md`
  plus accepted evidence
  `docs/evidence/ED-20260331-mvp-a1-backend-contractual-inventory.md`.
- This matrix now inherits the stable `MVP-A1` claim boundary and no longer
  carries provisional closure language.
- If `MVP-A1` changes claim boundaries in the future, this matrix must be
  updated in the same PR that changes those claims.

## Closure Confirmation (2026-03-31)

- Every roadmap `IN` claim still maps to concrete code evidence, test evidence,
  and an executable command.
- No mismatch was introduced by the final `MVP-A1` route and invariant freeze.
- `MVP-B1` can therefore be marked `done` as equivalent verifiable closure for
  the MVP claim-to-proof baseline.
