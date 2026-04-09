---
title: adapter-postgres Functionalities
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-postgres Functionalities

## Functionalities

| #   | Functionality                 | Description                                                                                            |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Workflow State Persistence    | Stores and retrieves workflow run state in Postgres, ensuring durability across restarts.              |
| 2   | Adapter Connection Management | Manages the Postgres connection pool lifecycle, including initialization, health checks, and teardown. |
| 3   | State Status Reporting        | Reports current state of managed workflow records back to the engine for orchestration decisions.      |
| 4   | State Query Execution         | Executes read queries against the Postgres state store to resolve run references and snapshots.        |
| 5   | State Mutation Operations     | Applies create, update, and delete mutations to workflow state records in a transactional manner.      |

## Main Methods

- `manageWorkflowState(runId: string, state: WorkflowState)`: Persists or updates the workflow state record identified by `runId` in the Postgres database.
- `manageAdapterConnections()`: Initialises and maintains the underlying `pg` connection pool used by all adapter operations.
- `reportStateStatus(runId: string): StateStatus`: Queries the state store and returns the current status of the specified workflow run to the calling engine.
- `storeWorkflowState(state: WorkflowState): Promise<void>`: Low-level persistence call executed by StateAggregate to write a state record to the database.
- `manageStateOperations(operation: StateOperation): Promise<void>`: Dispatches a create, update, or delete operation against the Postgres state table.

## Key Files

- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterAggregate.ts`
- `packages/@dvt/adapter-postgres/src/StateAggregate.ts`
