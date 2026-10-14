---
title: Cost Attribution Summary Component
status: Active
owner: API / Runtime
last_reviewed: 2026-05-24
planning_type: architecture
---

# Cost Attribution Summary Component

## Purpose

The cost attribution summary component exposes tenant-scoped usage facts that
can later feed billing and finance reporting. It is not a monetary estimator.
Until provider credit capture exists, monetary totals are unavailable by design.

## Query Rail

`GetCostAttributionSummary` is the canonical query rail.

- bounded context: Runtime read model
- read model: `CostAttributionSummary`
- application port: `GetCostAttributionSummaryUseCase`
- HTTP adapter: `GET /cost/attribution-summary`
- authorization: `run:list` on tenant/project/environment scope
- source: `IRunStateStoreRead` metadata, snapshots, and event streams

## Data Semantics

The read model reports:

- number of runs in scope;
- step completion and failure counts;
- total attributable step duration in milliseconds;
- first and last observed event timestamps;
- per-run and per-step attribution rows;
- `totalCostAmount: null` and `currency: null` until a credit-capture rail is
  implemented.

The component must not infer dollars from duration or row counts.

## Negative Behavior

The route fails closed when tenant scope is missing, tenant/project/environment
input is malformed, environment is supplied without project, limit exceeds the
hard ceiling, or authorization denies `run:list`.

<a id="section-cost-attribution-summary-user-stories"></a>

## Cost Attribution Summary User Stories

1. As a finance operator, I want tenant-scoped run usage facts so that billing
   analysis starts from backend-owned evidence instead of UI mock data.
2. As a platform operator, I want cost money fields to be explicitly unavailable
   until provider credits are captured so that the system does not report fake
   dollars.
3. As an API consumer, I want project and environment filters to use the same
   protected runtime authorization scope as run listing so that attribution data
   cannot leak across tenants.
4. As a future billing integrator, I want per-step duration facts and per-run
   rollups so that invoice logic can attach monetary data later without
   reinterpreting raw event streams.

> Acceptance scope status: Active. Owner: API / Runtime.
