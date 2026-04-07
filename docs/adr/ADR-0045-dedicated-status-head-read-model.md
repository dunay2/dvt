---
title: ADR-0045 - Dedicated status-head read model for hot run status queries
status: Proposed
owner: Architecture / Engine / State Store / Adapters
last_reviewed: 2026-04-07
---

# ADR-0045 - Dedicated status-head read model for hot run status queries

## Status

Proposed.

## Context

`ADR-0015` already separates authoritative engine status reads from provider
enrichment: `getRunStatus()` must return projected state from the event log
only.

Today that projection is effectively anchored on `run_snapshots` plus replay
fallback:

- if `run_snapshots` is current, `getRunStatus()` is fast;
- if `run_snapshots` is missing, callers fall back to replay;
- if `run_snapshots` is stale, the system must choose between:
  - synchronous catch-up on the write path,
  - synchronous catch-up on the read path,
  - or returning stale state.

That creates an architectural conflict:

1. `getRunStatus()` is a hot polling path and needs predictably cheap reads.
2. `run_snapshots` is a rich projection that carries workflow detail
   (`steps`, `gatewayDecisions`, `paused`, `cancelling`, terminal archive
   metadata).
3. Rich projections are larger, more expensive to maintain synchronously, and
   a worse fit for hard read-latency guarantees.

The repository now also has `snapshot_work_queue`, which is appropriate for
eventual catch-up of rich projections but is not sufficient on its own to
guarantee exact `O(1)` status reads.

This is not a novel problem. Mature event-sourced and workflow systems solve it
by separating query-shaped status summaries from full history or rich state:

- Temporal exposes workflow history separately from visibility APIs such as
  `ListWorkflowExecutions` and `CountWorkflowExecutions`.
- EventStoreDB/Kurrent projects event streams into queryable projection state
  and emitted result streams instead of forcing every query to replay history.
- Kafka Streams and ksqlDB materialize incremental query views from immutable
  event logs so reads stay fast without full recomputation.

The current DVT design needs the same separation.

## Decision

### 1. Introduce a dedicated status-head read model

The system will introduce a dedicated read model for hot status queries,
referred to in this ADR as `run_status_heads`.

Its purpose is to answer:

- `getRunStatus()`
- `enrichRunStatus()` base state
- list/status-summary queries
- maintenance checks that only require run-level lifecycle state

It is not a replacement for the canonical event log.

### 2. Update status heads synchronously in the append transaction

`run_status_heads` will be updated synchronously inside:

- `bootstrapRunTx()`
- `appendAndEnqueueTx()`

The reducer for this read model must be narrow and deterministic. It must only
maintain query-critical run lifecycle fields, not the full workflow snapshot.

This is intentionally different from rich snapshot projection:

- synchronous status-head maintenance is accepted because it is small and
  query-shaped;
- asynchronous rich snapshot rebuild remains the default for the broader
  workflow projection.

### 3. Keep `run_snapshots` as the rich secondary projection

`run_snapshots` remains in the architecture and keeps its current rich role:

- workflow snapshot for `steps` and `gatewayDecisions`
- cancellation/pause detail beyond hot status polling
- maintenance and repair support
- terminal archive pinning metadata

`run_snapshots` is no longer the primary latency-critical read model for
`getRunStatus()`.

`snapshot_work_queue` remains dedicated to keeping `run_snapshots` warm and
repairable in the background.

### 4. `getSnapshot()` remains a rich projection boundary, not the hot path

`IRunStateStore.getSnapshot()` keeps its existing contract:

- it may return `null`;
- callers may rebuild from events when they truly need the rich snapshot.

This ADR does not require `getSnapshot()` to become a guaranteed-constant-time
API. The constant-time target applies to hot run-status queries, not to rich
workflow snapshot retrieval.

### 5. Auditability and traceability remain anchored on the event log

This decision does not lower auditability or traceability.

Those guarantees continue to come from:

- immutable `run_events`
- monotonically increasing `run_seq`
- persisted event timestamps and event identifiers
- projection alignment via `last_run_seq`

The status-head projection is an operational query model, not an audit ledger.
Its job is to answer hot lifecycle queries cheaply and exactly.

Because of that, the hot-path runtime contract does not require a
status-head-specific `hash`.
The canonical audit trail remains the event log plus projection position.

### 6. Hot status queries must no longer depend on replay fallback

After rollout:

- `WorkflowEngineCoreService.getStatus()` must not require `listEvents()` in
  the steady-state hot path;
- queue lag in `snapshot_work_queue` must not affect the correctness or latency
  profile of `getRunStatus()`;
- rich snapshot lag may still exist, but it becomes operationally independent
  from hot status polling.

## Consequences

### Positive

- `getRunStatus()` gets a query-shaped authoritative read model with predictable
  cost.
- `run_snapshots` can remain rich and eventually consistent without contaminating
  the hot path.
- `snapshot_work_queue` keeps a clean role: rich snapshot catch-up and repair.
- The design aligns with proven production patterns from Temporal,
  EventStoreDB/Kurrent, and Kafka Streams/ksqlDB.

### Trade-offs

- The system will maintain two projections instead of one:
  - a narrow status head
  - a rich workflow snapshot
- The append transaction still performs some projection work, but only for a
  small, query-specific state model.
- Migration and backfill complexity increase because old runs need an initial
  `run_status_heads` row.

## Alternatives Considered

### A. Keep full snapshot write-through on every append

Rejected.

This preserves fast reads, but it keeps the write path coupled to the rich
workflow projection and defeats the goal of background snapshot pre-warming.

### B. Keep snapshots fully async and catch up on reads

Rejected.

This preserves asynchronous writes but degrades exact reads to `O(delta)` or
`O(N)` under worker lag or missing snapshots. It does not deliver the required
hot-path behavior.

### C. Add hot status columns to `run_snapshots` instead of introducing a new table

Rejected.

This still mixes two distinct lifecycles in one storage object:

- a narrow, latency-critical status head
- a rich, eventually consistent snapshot body

That coupling makes ownership, lag semantics, and operational cleanup less
clear than a dedicated query table.

## Implementation Notes

The likely physical shape of `run_status_heads` is:

- `run_id`
- `tenant_id`
- `status`
- `paused`
- `cancelling`
- `started_at`
- `completed_at`
- `last_run_seq`
- `updated_at`

Exact column names and indexes are implementation details, but the table must
be tenant-scoped and queryable without replay.

## References

Internal:

- [ADR-0004 - Event sourcing strategy](ADR-0004-event-sourcing-strategy.md)
- [ADR-0013 - bootstrapRunTx ownership](ADR-0013-run-state-store-bootstrapRunTx.md)
- [ADR-0015 - getRunStatus read model separation](ADR-0015-getRunStatus-read-model-separation.md)
- [ADR-0031 - Storage adapter tenant isolation](ADR-0031-adapter-tenant-isolation.md)

External patterns:

- [Temporal WorkflowService visibility APIs](https://api-docs.temporal.io/)
- [Kurrent / EventStoreDB projections](https://docs.kurrent.io/server/v22.10/http-api/projections)
- [Confluent ksqlDB materialized views](https://docs.confluent.io/platform/current/ksqldb/concepts/materialized-views.html)
- [Kafka Streams interactive queries](https://docs.confluent.io/platform/current/streams/developer-guide/interactive-queries.html)
