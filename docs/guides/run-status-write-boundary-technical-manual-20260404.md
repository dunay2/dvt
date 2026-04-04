---
title: Run-status write-boundary technical manual
status: Draft
owner: Engine / Adapters / Docs
last_reviewed: 2026-04-04
---

# Run-status write-boundary technical manual

## Purpose

Define the canonical transition rules enforced at event append boundary so
invalid sequences are rejected before persistence.

## Scope

Applies to all `appendAndEnqueueTx` implementations:

- `InMemoryRunStateStore`
- `InMemoryTxStore`
- `PostgresRunStateCoordinator` append path (through event repository + snapshot)

## Run-level model

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> RUNNING: RunStarted
    RUNNING --> PAUSED: RunPaused
    PAUSED --> RUNNING: RunResumed
    RUNNING --> CANCELLING: RunCancelRequested
    CANCELLING --> CANCELLED: RunCancelled
    RUNNING --> COMPLETED: RunCompleted
    RUNNING --> FAILED: RunFailed
    PAUSED --> FAILED: RunFailed
    CANCELLING --> FAILED: RunFailed
```

Note: `CANCELLING` is a derived substatus (`cancelling=true`), not a persisted
`WorkflowSnapshot.status` value.

Write-boundary rejection rules:

- `RunPaused` only valid from `RUNNING`.
- `RunResumed` only valid from `PAUSED`.
- `RunCancelled` only valid when run is in cancellation-intent state.
- terminal states (`COMPLETED`, `FAILED`, `CANCELLED`) reject mutating events.

### Signal pre-check guard

For signal-derived lifecycle events (`PAUSE`/`RESUME`), runtime performs a
transition pre-check against current snapshot/event history before calling the
provider adapter signal endpoint. This prevents external side effects when the
transition is already illegal (`INVALID_STATE_TRANSITION` fail-fast).

## Step-attempt model

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> RUNNING: StepStarted
    RUNNING --> COMPLETED: StepCompleted
    RUNNING --> FAILED: StepFailed
    PENDING --> SKIPPED: StepSkipped
    FAILED --> RUNNING: StepStarted (retry attempt)
```

Write-boundary rejection rules:

- `StepCompleted` only valid from `RUNNING`.
- `StepFailed` only valid from `RUNNING`.
- `StepSkipped` only valid from `PENDING`.
- terminal step states (`COMPLETED`, `SKIPPED`) reject subsequent step events.

## Append pipeline

```mermaid
sequenceDiagram
  participant Caller
  participant Store as appendAndEnqueueTx
  participant Dedup as idempotency index
  participant FSM as transition validator
  participant DB as event+snapshot store
  participant Outbox

  Caller->>Store: appendAndEnqueueTx(runId, events)
  Store->>Dedup: partition deduped vs candidate new
  Dedup-->>Store: deduped[], candidates[]
  Store->>FSM: validate candidates in-order against ephemeral state
  alt invalid transition
    FSM-->>Store: INVALID_STATE_TRANSITION
    Store-->>Caller: reject, no write side effects
  else valid
    FSM-->>Store: ok
    Store->>DB: append events + update snapshot
    Store->>Outbox: enqueue only newly appended events
    Store-->>Caller: AppendResult
  end
```

## TDD strategy

1. add red tests for illegal transitions in `@dvt/run-domain`.
2. add red tests in in-memory store append invariants.
3. add red integration tests in adapter-postgres append path.
4. implement minimal logic to pass all red tests.
5. keep regression coverage for dedupe replay behavior.
