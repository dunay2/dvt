# ADR-0014 — Run-Driven Adapter Model

Status: Proposed  
Date: 2026-02-20

## Context

Two competing adapter interfaces exist:

- a step-driven interface (executeStep-style)
- a run-driven interface (startRun with plan ref)

These define incompatible execution models and create integration confusion.

## Decision

- The canonical provider adapter model is **run-driven**:
  - `adapter.startRun(planRef, context)` hands the plan ref to the provider runtime, which owns step dispatch.
- Step lifecycle events are emitted from within adapter internals (e.g., Temporal activities) by writing to `IRunStateStore` directly.
- The engine is not in the step execution call path.

The step-driven interface is deprecated and removed from the published contracts surface:

- `packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts`

## Consequences

- Reduces ambiguity for adapter implementers.
- Aligns with clean boundary: engine orchestrates runs; provider executes steps.
- Temporal activities write events via IRunStateStore (no callback into engine).
