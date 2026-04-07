# ADR-0014 — Run-Driven Adapter Model

Status: Accepted  
Date: 2026-02-20

## Context

Two competing adapter interfaces exist:

- a step-driven interface (executeStep-style)
- a run-driven interface (startRun with plan ref)

These define incompatible execution models and create integration confusion.

## Decision

- The canonical provider adapter model is **run-driven**:
  - `adapter.startRun(plan, planRef, context)` hands the verified execution
    plan plus its persisted reference to the provider runtime, which owns step
    dispatch.
- Step lifecycle events are emitted from within adapter internals (e.g., Temporal activities) by writing to `IRunStateStore` directly.
- The engine is not in the step execution call path.
- Plan integrity ownership is centralized at the engine entry point before
  adapter dispatch (`ADR-0012`). Adapters consume the already-verified plan
  instance; they are not the authoritative verifier.

The step-driven interface is deprecated and removed from the published contracts surface:

- `packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts`

## Consequences

- Reduces ambiguity for adapter implementers.
- Aligns with clean boundary: engine orchestrates admission and verifies plan
  identity; provider executes steps.
- Temporal activities write events via IRunStateStore (no callback into engine).
