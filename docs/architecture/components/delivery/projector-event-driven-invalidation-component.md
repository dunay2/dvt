---
title: Projector Event-Driven Invalidation Component
status: Active
owner: Architecture / Delivery
last_reviewed: 2026-05-24
---

# Projector Event-Driven Invalidation Component

## Owned Concern

Projector event-driven invalidation owns how `ProjectorWorkerRuntime` discovers
snapshot rebuild work after run events are appended.

The canonical producer is the state-store append transaction that writes
`snapshot_work_queue`. The runtime consumes that queue through
`claimSnapshotWork(batchSize)`, rebuilds snapshots, and then completes or
retries the claimed item. Polling `listStaleSnapshotRuns()` is compatibility and
recovery behavior only; it is not the default discovery path when queue claiming
exists.

## Command And Query Rail

`ProjectorWorkerRuntime.runOnce` is an operational command rail.

- owning bounded context: Delivery
- DDD object: snapshot projection work item
- application port: `ProjectorStateStore.claimSnapshotWork`
- adapter surface: `snapshot_work_queue`
- scope: tenant/run scoped queue claims
- authorization: worker service capability for snapshot work queue access
- negative tests: queue-capable runtime must not call stale snapshot polling by
  default; explicit fallback polling remains opt-in

## Current Flow

```mermaid
sequenceDiagram
  participant Store as State store append transaction
  participant Queue as snapshot_work_queue
  participant Worker as ProjectorWorkerRuntime
  participant Snapshot as run_snapshots

  Store->>Queue: upsert run work on appended events
  Worker->>Queue: claimSnapshotWork(batchSize)
  Worker->>Snapshot: isSnapshotStale(tenantId, runId)
  Worker->>Snapshot: rebuildSnapshot(tenantId, runId)
  Worker->>Queue: completeSnapshotWork(...)
```

## Runtime Rule

When a store exposes `claimSnapshotWork`, the runtime treats queue claiming as
the normal invalidation rail. The runtime does not also scan stale snapshots to
fill remaining batch capacity unless `enableFallbackPolling` is explicitly set.

This keeps sustained run-event load from reintroducing the scan bottleneck that
the snapshot work queue was added to remove.

## Evidence

- [S19-F1 delivery evidence at its recorded revision](https://github.com/dunay2/dvt/blob/9ab717e3c10d49487319e44208ce46aae72ce0e5/docs/evidence/critical/ED-20260330-s19f1-phase1-phase2-snapshot-work-queue.md)
- `packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts`

<a id="section-projector-event-driven-invalidation-user-stories"></a>

## Projector Event-Driven Invalidation User Stories

| ID           | Story                                                                   | Acceptance                                                                 |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `US-PEI-001` | As an operator, I need projector discovery to consume queued work.      | Queue-capable runtime calls `claimSnapshotWork(batchSize)` every tick.     |
| `US-PEI-002` | As an operator, I need polling not to return as the default bottleneck. | Queue-capable runtime does not call `listStaleSnapshotRuns()` by default.  |
| `US-PEI-003` | As a maintainer, I need recovery polling to remain deliberate.          | Fallback polling runs only when `enableFallbackPolling` is explicitly set. |
| `US-PEI-004` | As a reviewer, I need stale queue rows handled safely.                  | Non-stale queued work is completed without rebuilding the snapshot.        |
| `US-PEI-005` | As a runtime owner, I need claim races to stay non-fatal.               | Lost complete/fail ownership logs a warning and does not crash the tick.   |

> Acceptance scope status: Active. Owner: Architecture / Delivery.
