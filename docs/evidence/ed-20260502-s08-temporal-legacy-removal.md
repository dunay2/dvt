---
title: S08 Temporal legacy removal
status: Accepted
date: 2026-05-02
owners:
  - '@dvt/adapter-temporal'
  - 'dvt-temporal-worker'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - apps/temporal-worker/src/runtime/temporalWorkerStores.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test -- test/temporalPlanArtifactReader.test.ts test/workflow-component-semantics.architecture.test.ts test/activities.test.ts
    - pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker typecheck
---

# ED-20260502 S08 Temporal Legacy Removal

This evidence covers the S08 Temporal composition slice that removes the local
`PlanFetcherLike` / `planStore` runtime authority from the Temporal worker and
routes execution-segment materialization through scoped `PS-Q08
FetchPlanForEngineDispatch`.

## Scope Proven

- Temporal activities now resolve execution segments with `ctx + planRef`.
- `ActivityDeps` depends on `TemporalPlanArtifactReader`, not raw
  `IPlanFetcher` and `IPlanIntegrityValidator`.
- `TemporalPlanArtifactReader` validates canonical plan ownership against
  `ResolvedRunContext` after integrity validation and before segment projection.
- Temporal worker composition exposes `planArtifactReader` instead of
  `PlanFetcherLike` or `planStore`.

## Negative Evidence

- Cross-scope dispatch materialization rejects with `PLAN_SCOPE_MISMATCH`.
- Missing plan ownership rejects with `PLAN_SCOPE_MISSING`.
- Architecture tests reject reintroduced `PlanFetcherLike`, `planStore`, and
  activity-level raw fetcher dependencies.

## Residual Scope

This does not close the broader S08 API/Postgres/engine scoped record migration.
Those files remain governed by their owning plan-store units.
