---
title: MVP-A1 Backend Contractual Inventory
status: Proposed
owner: Architecture / API / Docs
last_reviewed: 2026-03-29
planning_type: proposal
---

# MVP-A1 Backend Contractual Inventory

## Goal

Inventory the current backend MVP contractual surface from real `apps/api` code
without introducing new runtime behavior.

## Contractual Surface (Current Runtime)

Protected runtime endpoints (registered only when OIDC posture is complete):

- `POST /runs/start`
- `GET /runs`
- `GET /runs/:runId`
- `GET /runs/:runId/events`
- `POST /runs/:runId/signal`
- `POST /runs/:runId/cancel`

Public operational endpoints:

- `GET /healthz` (always registered)
- `GET /readyz` (registered only when `DVT_READYZ_ENABLED=true`)

Canonical route source:

- `apps/api/src/entrypoints/http/runtimeRoutes.constants.ts`
- `apps/api/src/app.ts`
- `apps/api/src/routes/health.ts`

## Activation Boundary

Protected runtime routes are enabled only when:

- `OIDC_JWKS_URI` is set
- `OIDC_ISSUER` is set
- `OIDC_AUDIENCE` is set
- `DATABASE_URL` is available when protected runtime module is built

If OIDC posture is incomplete, runtime endpoints are intentionally not
registered and the API exposes only public operational routes.

Canonical source:

- `apps/api/src/app.ts`
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`

## Authorization Boundary (Action Matrix)

| Endpoint                                               | Action          |
| ------------------------------------------------------ | --------------- |
| `POST /runs/start`                                     | `run:start`     |
| `GET /runs`                                            | `run:list`      |
| `GET /runs/:runId`                                     | `run:view`      |
| `GET /runs/:runId/events`                              | `run:logs:view` |
| `POST /runs/:runId/signal` with `PAUSE`/`RESUME`       | `run:signal`    |
| `POST /runs/:runId/cancel`                             | `run:cancel`    |
| `POST /runs/:runId/signal` with `CANCEL` (compat mode) | `run:cancel`    |

Canonical source:

- `apps/api/src/entrypoints/http/runCommandRoute.constants.ts`
- `apps/api/src/entrypoints/http/signalRunRouteParser.ts`
- `apps/api/src/entrypoints/http/cancelRunRouteParser.ts`

## Input And Scope Invariants (MVP)

- Protected runtime requests require bearer authentication and tenant-scoped
  authorization before use-case execution.
- Query endpoints require `tenantId` scope in query parsing.
- Command endpoints enforce route/body parsing before authorization.
- `POST /runs/:runId/signal` supports `CANCEL` only under compatibility policy
  (`DVT_SIGNAL_ROUTE_ALLOW_CANCEL`).

Canonical source:

- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/listRunsRoute.ts`
- `apps/api/src/entrypoints/http/getRunRoute.ts`
- `apps/api/src/entrypoints/http/getRunEventsRoute.ts`
- `apps/api/src/entrypoints/http/signalRunRoute.ts`
- `apps/api/src/entrypoints/http/cancelRunRoute.ts`
- `apps/api/src/plugins/env.ts`

## Explicit Non-Goals For MVP-A1

- No new runtime route additions.
- No change to runtime authorization semantics.
- No change to execution completion behavior.
- No scale/performance policy redesign.

## Verification Baseline

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm verify:prepush
```

## Traceability Link

This inventory is the Lane A `MVP-A1` artifact referenced by:

- `docs/planning/state/agent-lane-a.yaml`
- `docs/planning/proposals/mvp-backend-operability-baseline-roadmap-20260329.md`
