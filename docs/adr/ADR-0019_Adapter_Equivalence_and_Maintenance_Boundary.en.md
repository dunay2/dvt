# ADR-0019 — Adapter Equivalence and Maintenance Boundary

Status: Accepted  
Date: 2026-02-26

## Context

The review on 2026-02-25 identified ambiguity in 3 contract points:

1. **Adapter equivalence**: Previously interpreted as “Temporal and Conductor behave identically internally,” which is not true (replay, scheduling, and lifecycle differ).
2. **`logicalAttemptId`**: Must remain as the authority of the adapter/runtime (aligned with determinism in Temporal).
3. **`detectStuckRuns`**: Is operational batch maintenance, not a core operation of the `IWorkflowEngine` contract.

## Decision

1. **Adapter equivalence** is redefined as **state-equivalent**, not execution-equivalent:
   - Given the same `ExecutionPlan` and identical step results, the Store must converge to the same state/catalog of canonical events.
   - Internal runtime trace equivalence is not required (Temporal != Conductor).

2. **`logicalAttemptId` authority** remains in adapters/runtime:
   - ADR-0016 is reaffirmed.
   - The engine does not infer `logicalAttemptId` from DB reads at emission time.

3. **Operational maintenance** is removed from the core contract:
   - `detectStuckRuns` moves to a dedicated port (`IRunMaintenanceService`) and is not part of the essential `IWorkflowEngine` API.
   - `IWorkflowEngine` remains focused on execution lifecycle (start/cancel/status/signal).

## Consequences

- Reduces overpromising between adapters and clarifies the real scope of portability.
- Avoids mixing batch operation responsibilities with execution contract.
- Prepares a clean path to implement maintenance jobs with independent policies and limits.

## Validation

- Contracts/documentation explicitly reflect “state-equivalent.”
- `IWorkflowEngine` stops exposing batch maintenance in a later contract review (target P0-13).
- Conformance tests focus on canonical state/events in Store, not internal runtime equivalence.

## Related
