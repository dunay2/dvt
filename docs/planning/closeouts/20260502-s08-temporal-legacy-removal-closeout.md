---
title: S08 Temporal legacy removal closeout
status: Review
owner: Architecture / Temporal / Artifacts
last_reviewed: 2026-05-02
planning_type: closeout
work_item: S08 / SYS-PLANSTORE-TEMPORAL-COMPOSITION
---

# S08 Temporal Legacy Removal Closeout

## Think-First Analysis

### Problem Summary

`SYS-PLANSTORE-TEMPORAL-COMPOSITION` is still classified as `legacy` because the
Temporal worker runtime carries a loose `PlanFetcherLike`/`planStore` resource
and the workflow segment resolver asks activities to fetch a `PlanRef` without a
run scope. That lets a content-valid `PlanRef` look sufficient for engine
dispatch, even though the S08 command/query matrix says dispatch materialization
must be a scoped query.

### Root Cause

The worker was assembled before the S08 Model B distinction was explicit. It
therefore reused `PostgresPlanStore` as an engine fetcher and passed it through
generic runtime resource names. The result is a hidden-authority boundary:
artifact integrity is checked, but tenant/project/environment ownership is not
part of the query input that resolves execution segments.

### Constraints And Invariants

- `ADR-0031` requires explicit tenant isolation at adapter boundaries.
- `ADR-0034` requires bounded-context behavior to cross named ports rather than
  convenience helpers.
- `ADR-0039` requires hexagonal/SOLID remediation rather than broad runtime
  services with mixed reasons to change.
- `ADR-0042` keeps executable plan identity content-derived, but that identity
  is not authorization.
- `ADR-0043` keeps plan-store behavior in `@dvt/artifacts` and rejects a shared
  repository-shaped S08 port.
- `ADR-0052` keeps Temporal workflow durable input compact: `PlanRef` plus
  control cursor, not full `ExecutionPlan`.
- The S08 C&Q matrix allows this slice only through `PS-Q08`
  `FetchPlanForEngineDispatch`.

### Options Considered

| Option                                                                        | Result   | Reason                                                                                                                                         |
| ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete Temporal PlanRef fetch and pass full plans again                       | Rejected | Violates ADR-0052 and would reintroduce durable full-plan payloads.                                                                            |
| Keep `PlanFetcherLike` and add comments                                       | Rejected | Leaves the legacy runtime graph intact and hides the missing scope.                                                                            |
| Make workflow segment resolution call a scoped dispatch-materialization query | Selected | Keeps compact `PlanRef` workflow input while making the activity query carry `ResolvedRunContext` scope and fail closed on ownership mismatch. |

### Selected Option And Rationale

Introduce a Temporal-owned dispatch materialization query seam:
`FetchPlanForEngineDispatch`. The activity receives `ctx + planRef`, resolves the
artifact through a focused reader, and validates that the fetched canonical plan
ownership matches the run context before projecting the requested execution
segment. The worker no longer exposes `PlanFetcherLike` or `planStore` as a
runtime resource; it exposes a scoped plan-artifact reader.

### Rejected Alternatives

- A new SQL-backed scoped adapter is out of scope for this slice because the
  S08 matrix lists API/Postgres scoped record migration separately.
- A workflow-level ownership check without changing the activity input is
  insufficient because the actual fetch still runs without scope.
- Reusing the raw engine `IPlanFetcher` as the public worker dependency keeps
  the same legacy shape under a new name.

## Fowler Opportunity Matrix

| Scenario                                               | Opportunity                       | Fowler pattern                             | DDD owner                                                             | C&Q rail                            | Implementation surfaces                                                                            | Unit or package test                               | Architecture test                                                                                             | User-flow test                                       | Out of scope                     |
| ------------------------------------------------------ | --------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| Temporal resolves an execution segment from `PlanRef`  | Hidden authority / boundary drift | Gateway + Policy Object around driven port | Engine dispatch application query owned by Temporal activity boundary | `PS-Q08 FetchPlanForEngineDispatch` | `packages/@dvt/adapter-temporal/src/activities/**`, workflow activity input, worker runtime wiring | Negative ownership mismatch test for scoped reader | Guard that workflow segment resolution passes `ctx` and runtime has no `PlanFetcherLike`/`planStore` resource | Existing workflow tests only; no UI visible behavior | Postgres scoped record migration |
| Temporal worker composes plan artifact access          | Responsibility overload           | Rename Extracted Service / Gateway         | Temporal worker composition root                                      | `PS-Q08` implementation dependency  | `apps/temporal-worker/src/runtime/**`                                                              | Runtime resource construction test                 | SRP architecture test forbids legacy tokens                                                                   | None                                                 | API composition drift            |
| Docs and governance classify temporal plan-store files | Documentation drift               | Published Language / System of Record      | Governance file index                                                 | none - status update only           | governance status docs and generated indexes                                                       | docs governance checks                             | fingerprint/index gates                                                                                       | None                                                 | Claiming full S08 closure        |

## Pre-Implementation Brief

- **Mode:** Full. This changes worker/activity architecture, adapter package
  contracts, docs, and ARC-triggered paths.
- **Scope:** Remove Temporal legacy runtime plan-fetcher shape, add scoped
  dispatch materialization query, update tests/docs/governance.
- **Touched paths:** `packages/@dvt/adapter-temporal/**`,
  `apps/temporal-worker/**`, S08 closeout/status docs, ARC evidence/risk when
  required.
- **Expected outcome:** Temporal segment resolution cannot fetch by unscoped
  `PlanRef`; the worker runtime no longer exposes `PlanFetcherLike`/`planStore`
  as a plan-store authority.
- **Risks and mitigations:** Existing workflow tests may rely on the old activity
  input shape; update them through the same public activity contract and keep
  durable workflow input unchanged.
- **Out of scope:** S08 Postgres scoped record schema, API composition drift,
  engine port redesign, frontend behavior, retention/GC.
- **Validation plan:** targeted adapter-temporal tests, temporal-worker tests,
  typecheck for both packages, architecture tests, docs sync/index/fingerprint,
  ARC check, and `pnpm verify:prepush`.
- **Negative tests:** ownership mismatch, missing plan ownership, architecture
  guard for no `PlanFetcherLike`/`planStore`, workflow segment query includes
  `ctx`.
- **Libraries evaluated:** none adopted. This is boundary wiring over existing
  typed ports and policies; no external library improves ownership validation.
- **Command/query rail impact:** reuses `PS-Q08 FetchPlanForEngineDispatch`;
  no new rail introduced.
- **Fowler planning impact:** removes hidden authority and responsibility
  overload in Temporal worker plan artifact access; leaves API/Postgres scoped
  record migration as explicit residual S08 work.

## Implementation Result

### Real Change

- Added `TemporalPlanArtifactReader` as the Temporal activity gateway for
  `PS-Q08 FetchPlanForEngineDispatch`.
- Changed segment resolution activity input from `planRef + layerIndex` to
  `ctx + planRef + layerIndex`.
- Removed `PlanFetcherLike`, `planFetcherFactory`, and `planStore` from the
  Temporal worker public runtime resource graph.
- Kept durable workflow input unchanged: workflow still receives compact
  `PlanRef` and passes run context only into the activity query.

### Negative Coverage

- Cross-tenant dispatch materialization fails with `PLAN_SCOPE_MISMATCH`.
- Missing plan ownership fails with `PLAN_SCOPE_MISSING`.
- Architecture guards reject reintroduction of raw `PlanFetcherLike`/`planStore`
  runtime wiring.
- Workflow/activity architecture guards require `ctx` to be passed into segment
  resolution.

### Residual Scope

This closes local `SYS-PLANSTORE-TEMPORAL-COMPOSITION` legacy propagation only.
It does not claim full S08 closure. The remaining S08 drift is still owned by
API/Postgres scoped record migration and other plan-store composition units
already listed in the status inventories.
