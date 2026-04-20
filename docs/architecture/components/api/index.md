---
title: apps/api
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-20
---

# apps/api

`apps/api` is the authenticated HTTP composition root for DVT.

It owns route parsing, auth and tenant checks, admission, runtime command and
query wiring, operational probes, and reconciler bootstrap inside the API
process.

## Current Responsibilities

- expose protected runtime routes for start, list, get, events, signal, and cancel;
- expose plan preview/import routes used by the frontend planning flow;
- expose optional admin rebuild routes when operationally enabled;
- compose planner, engine, delivery, and operational dependencies;
- surface readiness, health, version, and reconciler state;
- keep auth and admission decisions at the entry boundary.

## Interface Map

```mermaid
flowchart LR
  Clients["apps/web / operators / automation"] --> API["apps/api"]
  API --> Auth["OIDC / JWKS / principal access"]
  API --> Planner["@dvt/planner"]
  API --> Engine["@dvt/engine"]
  API --> Delivery["@dvt/delivery admission guard"]
  API --> Postgres["@dvt/adapter-postgres state, intent, and plan stores"]
  API --> Providers["mock / temporal provider adapters"]
  API --> Observability["@dvt/observability"]
```

## Code Anchors

- [app.ts](../../../../apps/api/src/app.ts)
- [server.ts](../../../../apps/api/src/server.ts)
- [buildProtectedRuntimeModule.ts](../../../../apps/api/src/modules/buildProtectedRuntimeModule.ts)
- [buildProviderAdapters.ts](../../../../apps/api/src/modules/buildProviderAdapters.ts)
- [planCompileBoundary.ts](../../../../apps/api/src/modules/planCompileBoundary.ts)
- [executePlanRouteFacade.ts](../../../../apps/api/src/entrypoints/http/executePlanRouteFacade.ts)
- [startRunRoute.ts](../../../../apps/api/src/entrypoints/http/startRunRoute.ts)
- [previewPlanRoute.ts](../../../../apps/api/src/entrypoints/http/previewPlanRoute.ts)
- [importPlanRoute.ts](../../../../apps/api/src/entrypoints/http/importPlanRoute.ts)
- [compilePlanRoute.ts](../../../../apps/api/src/entrypoints/http/compilePlanRoute.ts)
- [adminRoutes.ts](../../../../apps/api/src/entrypoints/http/adminRoutes.ts)
- [getRunRoute.ts](../../../../apps/api/src/entrypoints/http/getRunRoute.ts)

## Current Posture

This component is active product code. The protected plan-route family now
shares one remote-facade executor, one declarative request-resolution recipe,
and route-declared authorization metadata. Preview observability enrichment
now binds once at the request boundary used by the preview flow. The
`plan compile` boundary now converges catalog policy, typed profile selection,
and planner construction in one root-owned boundary module.

## Current To Target

Use the main walkthrough below for the real current system, the target API
shape, and the governed transition route:

- [API Current To Target Architecture](./api-current-to-target-architecture.md)
- [API Control-Plane User Manual](../../../guides/api-control-plane-user-manual-20260404.md)
- [API Control-Plane Technical Manual](../../../guides/api-control-plane-technical-manual-20260404.md)
- [API Runtime SLA Canonical](../../../runbooks/api-runtime-sla-canonical-20260404.md)

## Planned Delta

- keep the frontend-consumable contract explicit under `MVP-E1`;
- preserve admission and health semantics that the UI health work (`F-03`)
  relies on.
- keep planner preview/import and runtime command routes aligned so the API
  stays the only browser-facing backend entry surface.

## Historical Deep Dives

These notes are older decomposition artifacts. Use them only as supporting
detail after the current page:

- [DDD Structure](./api-ddd.md)
- [Functionalities](./api-functional.md)
- [Constraints and invariants](./api-constraints.md)
- [Sequence diagrams](./api-sequence.md)
