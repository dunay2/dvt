# Temporal Worker Topology

Status: Draft  
Date: 2026-02-20

## Context

Temporal worker processes execute workflow and activity code separately from the engine/API process. Workflow code must remain deterministic; activities can do IO.

## Decision

- Workflow code MUST be deterministic (no external IO, no env reads).
- Activities MAY perform IO (DB writes, HTTP calls).
- Step lifecycle events are persisted by activities via:
  - `IRunStateStore.appendAndEnqueueTx(...)` (preferred)

### State store client instantiation (normative)

- The Temporal worker process instantiates its **own** Postgres connection pool.
- Pool configuration is injected via worker configuration/bootstrap.
- Connection configuration (e.g., `DATABASE_URL`, pool size) is read from the environment **at worker process startup**, before polling begins.
- It MUST NOT be read inside workflow function code.
- Pool lifecycle:
  - created before worker starts polling the task queue
  - closed on worker shutdown

### logicalAttemptId propagation (normative)

- `logicalAttemptId` is tracked in workflow state.
- The workflow passes `logicalAttemptId` as an explicit input parameter to each activity that emits events.
- Activities must include the provided logicalAttemptId in RunEventInput.

### Expected failure mode: activity write failure (normative)

If an activity fails while writing events to the state store, Temporal retries the activity. The retry re-attempts event emission. This is expected and correct:

- idempotencyKey derivation + append authority dedupe ensure duplicate emissions are safe.
- adapters MUST NOT add bespoke dedupe logic; rely on the store.

## Operational model

Engine/API process:

- Validates PlanRef metadata (ADR-0012)
- Calls stateStore.bootstrapRunTx({metadata, firstEvents:[RunQueued]})
- Calls adapter.startRun(planRef, ctx)

Temporal worker process:

- Workflow begins executing
- Emits RunStarted from within workflow execution context (ADR-0011)
- Schedules activities for step dispatch
- Activities write step events via state store + outbox
