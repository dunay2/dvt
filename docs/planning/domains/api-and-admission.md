---
title: Domain - API And Admission
status: Review
owner: API / Product / Docs
last_reviewed: 2026-09-10
planning_type: reference
---

# Domain - API And Admission

Planning surfaces for API entrypoints, admission control, read/query endpoints,
and auth-runtime integration.

## Canonical Sources

- [Architecture Surface Inventory](../../architecture/architecture-surface-inventory-20260402.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [Canonical Doc Code Matrix](../status/canonical-doc-code-matrix.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)

## Active Planning Inputs

## Risk And Evidence Links

- [API Auth Runtime Integration Coverage Risk](../../risk-register/quality/r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260308-api-auth-01)
- [Evidence Index](../../evidence/index.md)

<a id="section-cost-attribution-summary-component"></a>

```yaml
title: Cost Attribution Summary Component
status: Active
owner: API / Runtime
last_reviewed: 2026-05-24
planning_type: architecture
```

<a id="section-cost-attribution-summary-component--cost-attribution-summary-component"></a>

## Cost Attribution Summary Component

<a id="section-cost-attribution-summary-component--purpose"></a>

### Purpose

The cost attribution summary component exposes tenant-scoped usage facts that
can later feed billing and finance reporting. It is not a monetary estimator.
Until provider credit capture exists, monetary totals are unavailable by design.

<a id="section-cost-attribution-summary-component--query-rail"></a>

### Query Rail

`GetCostAttributionSummary` is the canonical query rail.

- bounded context: Runtime read model
- read model: `CostAttributionSummary`
- application port: `GetCostAttributionSummaryUseCase`
- HTTP adapter: `GET /cost/attribution-summary`
- authorization: `run:list` on tenant/project/environment scope
- source: `IRunStateStoreRead` metadata, snapshots, and event streams

<a id="section-cost-attribution-summary-component--data-semantics"></a>

### Data Semantics

The read model reports:

- number of runs in scope;
- step completion and failure counts;
- total attributable step duration in milliseconds;
- first and last observed event timestamps;
- per-run and per-step attribution rows;
- `totalCostAmount: null` and `currency: null` until a credit-capture rail is
  implemented.

The component must not infer dollars from duration or row counts.

<a id="section-cost-attribution-summary-component--negative-behavior"></a>

### Negative Behavior

The route fails closed when tenant scope is missing, tenant/project/environment
input is malformed, environment is supplied without project, limit exceeds the
hard ceiling, or authorization denies `run:list`.

<a id="section-cost-attribution-summary-component--section-cost-attribution-summary-user-stories"></a>

<a id="section-cost-attribution-summary-component--cost-attribution-summary-user-stories"></a>

### Cost Attribution Summary User Stories

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
