# ADR-0014 — Run-Driven Adapter Model

Status: Accepted  
Date: 2026-02-20
Owners: Architecture / Engine / Temporal

## Context

Two competing adapter interfaces exist:

- a step-driven interface (executeStep-style)
- a run-driven interface (startRun with plan ref)

These define incompatible execution models and create integration confusion.

## Decision

- The canonical provider adapter model is **run-driven**:
  - `adapter.startRun(planRef, context)` hands the engine-approved immutable
    plan reference to the provider runtime, which owns step dispatch.
  - provider runtimes that fetch plan material by `PlanRef` must revalidate
    `PlanRef.sha256` before executing resolved segments.
- Step lifecycle events are emitted from within adapter internals (e.g., Temporal activities) by writing to `IRunStateStore` directly.
- The engine is not in the step execution call path.
- Plan integrity ownership is centralized at the engine entry point before
  adapter dispatch (`ADR-0012`). Adapters consume the already-approved
  immutable `PlanRef`; they are not the authoritative start-run verifier.

The step-driven interface is deprecated and removed from the published contracts surface:

- `packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts`

## Consequences

- Reduces ambiguity for adapter implementers.
- Aligns with clean boundary: engine orchestrates admission and verifies plan
  identity; provider executes steps.
- Temporal activities write events via IRunStateStore (no callback into engine).
