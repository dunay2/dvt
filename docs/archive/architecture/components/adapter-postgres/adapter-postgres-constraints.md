---
title: adapter-postgres Constraints & Invariants
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-postgres Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                      | Where Enforced                                   | Description                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Only interacts with Execution Domain and engine             | PostgresAdapterAggregate boundary                | The adapter must not accept calls from outside the Execution Domain; all external access goes through the engine.                     |
| Must comply with Postgres adapter contracts                 | PostgresAdapterAggregate constructor / DI wiring | The adapter must implement the interface defined by `@dvt/contracts` (e.g., `IRunStateStore`) and must not deviate from its contract. |
| State mutations must be transactional                       | StateAggregate                                   | All create/update/delete operations on workflow state records must be wrapped in a Postgres transaction to prevent partial writes.    |
| Connection pool must be initialised before state operations | PostgresAdapterAggregate                         | No state read or write operation may be executed before the adapter connection has been successfully established.                     |
| State records are immutable once in terminal status         | StateAggregate                                   | Workflow state records that have reached a terminal status (e.g., `COMPLETED`, `FAILED`) must not be mutated further.                 |
| Run IDs must be unique                                      | Postgres unique index on `run_id` column         | Each workflow run must have a globally unique identifier; duplicate insertions are rejected at the database level.                    |

## Validation Examples

- Attempting to update a `COMPLETED` run state raises an invariant violation and is rejected by `StateAggregate` before reaching the database.
- Calling `manageWorkflowState` before `manageAdapterConnections` completes results in a `ConnectionNotInitialisedError`.
- Inserting a duplicate `run_id` causes a Postgres unique constraint error which is caught, wrapped, and re-thrown as a domain-level `DuplicateRunError`.

## Key Files

- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterAggregate.ts`
- `packages/@dvt/adapter-postgres/src/StateAggregate.ts`
