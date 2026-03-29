---
title: MVP Backend Operability Baseline Roadmap
status: Proposed
owner: Product / Architecture / API / Docs
last_reviewed: 2026-03-29
planning_type: proposal
---

# MVP Backend Operability Baseline Roadmap

## Goal

Reset planning scope to a pragmatic MVP baseline: the current backend
control-plane that is already implemented and testable. This roadmap does not
add new runtime behavior. It defines what is in, what is out, and how each MVP
claim is proven.

## MVP Definition (Current Truth)

MVP backend is defined as an operational control-plane with:

- protected run command/query routes
- health and readiness endpoints
- OIDC authentication and tenant-scoped authorization
- run state/event queryability for operators

Not included in MVP definition:

- automatic terminal execution orchestration as a completed product flow
- scale tuning and advanced concurrency strategy
- retention/partition/sharding rollout
- UI feature depth not required for backend operability

## Scope

### IN (explicit)

- `POST /runs/start`
- `GET /runs`
- `GET /runs/:runId`
- `GET /runs/:runId/events`
- `POST /runs/:runId/signal`
- `POST /runs/:runId/cancel`
- `GET /healthz`
- `GET /readyz`
- OIDC auth + tenant policy for protected runtime routes

### OUT (explicit)

- Automatic terminal completion semantics and workflow auto-finish features
- Concurrency deep dives, sharding, and scale optimization programs
- Retention/partition implementation slices
- GTM and enterprise scale slices
- Frontend-only feature expansion not needed to operate backend MVP

## Capability Matrix (Claim -> Evidence -> Command)

| MVP claim                                                                                                | Evidence in repo                                                                                                                                                                                          | Validation command                       |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Protected runtime route surface exists and is wired                                                      | `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`, `apps/api/src/app.ts`                                                                                                                         | `pnpm --filter dvt-api test`             |
| `POST /runs/start` works in protected runtime path                                                       | `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                                          | `pnpm --filter dvt-api test:integration` |
| Query routes (`GET /runs`, `GET /runs/:runId`, `GET /runs/:runId/events`) are available under protection | `apps/api/src/app.ts`, `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                                                   | `pnpm --filter dvt-api test:integration` |
| Signal and cancel operations are available (`POST /runs/:runId/signal`, `POST /runs/:runId/cancel`)      | `apps/api/src/app.ts`, `apps/api/test/integration/protectedRuntime.integration.test.ts`, `apps/api/test/entrypoints/http/signalRunRoute.test.ts`, `apps/api/test/entrypoints/http/cancelRunRoute.test.ts` | `pnpm --filter dvt-api test`             |
| Health/readiness endpoints expose operational status                                                     | `apps/api/src/routes/health.ts`, `apps/api/src/routes/healthReadinessPolicy.ts`, `apps/api/test/app.test.ts`                                                                                              | `pnpm --filter dvt-api test`             |
| OIDC + tenant authorization gates protected runtime                                                      | `apps/api/src/modules/buildProtectedRuntimeModule.ts`, `apps/api/test/integration/protectedRuntime.integration.test.ts`                                                                                   | `pnpm --filter dvt-api test:integration` |

## Deferred Backlog (Explicitly Out Of MVP)

| Deferred item                                                          | Why deferred for MVP                           | Owner lane |
| ---------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| Advanced concurrency tuning and claim-timeout optimization             | Not required to operate baseline control-plane | Lane D     |
| Event log partitioning and read-replica rollout                        | Scale program, not baseline operability        | Lane D     |
| Retention/archival automation completion                               | Lifecycle hardening after MVP baseline freeze  | Lane D     |
| Extended retry ownership and policy deepening beyond accepted baseline | Not required for current operability truth     | Lane C     |
| Frontend advanced views and progressive feature-flag expansion         | Not required to define backend MVP surface     | Lane E     |

## Agent Task Allocation (Consolidation Only)

- `MVP-A1` (Lane A): contractual inventory of backend runtime surface and
  invariants.
- `MVP-B1` (Lane B): traceability matrix linking each MVP claim to evidence and
  tests.
- `MVP-C1` (Lane C): minimal operational runbook (start, diagnose, operate).
- `MVP-D1` (Lane D): residual risk baseline after MVP freeze.
- `MVP-E1` (Lane E): backend consumption contract for frontend using current
  capabilities only.

## Acceptance

This roadmap reset is accepted when:

1. MVP scope (`IN`/`OUT`) is unambiguous and reflected across planning state.
2. Each MVP claim maps to concrete repository evidence and executable command.
3. Deferred work is explicitly listed with owner lanes.
4. Lane tasks exist for `MVP-A1` to `MVP-E1`.

## Validation Baseline

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm --filter @dvt/engine test
pnpm verify:prepush
```
