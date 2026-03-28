---
title: adapter-temporal Constraints & Invariants
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-temporal Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                            | Where Enforced                                   | Description                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Only interacts with Execution Domain and engine                   | TemporalAdapterAggregate boundary                | The adapter must not accept direct calls from outside the Execution Domain; all orchestration goes through the engine.                   |
| Must comply with Temporal adapter contracts                       | TemporalAdapterAggregate constructor / DI wiring | The adapter must implement the interface defined by `@dvt/contracts` and must not deviate from the established contract shape.           |
| Adapter connection must be established before workflow operations | TemporalAdapterAggregate                         | No workflow start, query, or signal operation may be dispatched before the Temporal client connection has been successfully established. |
| Workflow IDs must map 1-to-1 with DVT run IDs                     | WorkflowAggregate                                | Each DVT run ID must correspond to exactly one Temporal workflow execution; duplicate starts for the same run ID are rejected.           |
| Workflow definitions are immutable once submitted                 | WorkflowAggregate                                | A workflow definition that has been used to start a Temporal execution must not be altered retroactively.                                |
| Run reference lookup must be idempotent                           | TemporalAdapterAggregate / `lookupRunRef`        | Calling `lookupRunRef` multiple times with the same run ID must always return the same Temporal execution handle without side effects.   |

## Validation Examples

- Calling `manageWorkflowExecution` before `manageAdapterConnections` completes raises a `TemporalConnectionNotReadyError`.
- Attempting to start a second workflow execution for an already-active run ID is detected by `WorkflowAggregate` and results in a `DuplicateWorkflowExecutionError`.
- A `lookupRunRef` call for an unknown run ID returns a `RunRefNotFoundError` rather than silently returning null.

## Key Files

- `packages/@dvt/adapter-temporal/src/TemporalAdapterAggregate.ts`
- `packages/@dvt/adapter-temporal/src/WorkflowAggregate.ts`
- `packages/@dvt/adapter-temporal/src/TemporalRunAdapter.ts`
