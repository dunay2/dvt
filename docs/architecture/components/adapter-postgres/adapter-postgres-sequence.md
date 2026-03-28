---
title: adapter-postgres Sequence
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-postgres Sequence

## Main Flow: Persisting Workflow State

```mermaid
sequenceDiagram
  participant Engine as @dvt/engine
  participant Adapter as PostgresAdapterAggregate
  participant State as StateAggregate
  participant DB as Postgres Database

  Engine->>Adapter: manageWorkflowState(runId, state)
  Adapter->>Adapter: validateConnectionReady()
  Adapter->>State: storeWorkflowState(state)
  State->>State: validateStateInvariant(state)
  State->>DB: BEGIN TRANSACTION
  State->>DB: INSERT / UPDATE run_state WHERE run_id = runId
  DB-->>State: rows affected
  State->>DB: COMMIT
  DB-->>State: OK
  State-->>Adapter: StateStored event
  Adapter-->>Engine: reportStateStatus(runId) → StateStatus
```

## Global Flow Position

`@dvt/adapter-postgres` sits at the persistence boundary of the Execution Domain. The engine calls it whenever it needs to durably record or retrieve the state of a workflow run. It does not call any other DVT package — it is a leaf in the dependency graph, depending only on the Postgres driver (`pg`) and the contracts defined in `@dvt/contracts`. Upstream: `@dvt/engine` is the sole caller. Downstream: the Postgres database.

## Key Files

- `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
- `packages/@dvt/adapter-postgres/src/PostgresAdapterAggregate.ts`
- `packages/@dvt/adapter-postgres/src/StateAggregate.ts`
