# ADR-0013 — IRunStateStore.bootstrapRunTx

Status: Proposed  
Date: 2026-02-20

## Context

Option D schema evolution (projector may fill missing fields from RunMetadata) requires that `run_metadata` exists before any events are visible. The current sequence can persist events before RunMetadata, creating an observable inconsistency window.

Additionally, the initial run write should be atomic with outbox enqueue to avoid "event persisted, not delivered" gaps.

## Decision

Introduce an explicit atomic bootstrap method:

```ts
export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: RunEventInput[]; // typically [RunQueued]; sync adapters may include RunStarted
}

export interface IRunStateStore {
  // Atomic: persists run_metadata + first events + outbox entries in one transaction
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;

  appendAndEnqueueTx(runId: string, events: RunEventInput[]): Promise<AppendResult>;
  listEvents(runId: string): Promise<RunEventPersisted[]>;
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
}
```

Normative rules:

- `bootstrapRunTx` MUST atomically:
  - insert `run_metadata`
  - append `firstEvents` into `run_events`
  - enqueue outbox records for **appended** events only
- `appendAndEnqueueTx` is used for all subsequent event appends.
- Callers MUST NOT create run metadata mid-run via non-bootstrap paths.

### Conflict behavior (normative)

- `bootstrapRunTx` assumes the run is new.
- If `run_metadata` already exists for `metadata.runId`, the store MUST fail deterministically with `RUN_ALREADY_EXISTS`.
- The engine is expected to guard with `ensureRunDoesNotExist` before calling `bootstrapRunTx`; the store-level error is the last line of defense.

## Implementation notes

Postgres:

- `BEGIN; INSERT run_metadata; INSERT run_events; INSERT outbox; COMMIT;`

In-memory:

- Single synchronous block updating in-memory maps/lists with no async interleaving.

## Consequences

- Removes the metadata-before-events race.
- Makes first write path explicit and testable.
- Supports Option D dual-read evolution safely.
