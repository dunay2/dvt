---
title: G10 - AI Execution Tracker
status: Archived
owner: Delivery / Engineering
last_reviewed: 2026-03-20
planning_type: execution-plan
---

# G10 - AI Execution Tracker

Historical planning artifact retained for reference. `G10` is closed; active
status lives in [Gap Execution Plans](../../../planning/gaps/GAP_EXECUTION_PLANS.md).

Operational tracker for AI-assisted execution of `G10`.

## Authority Rule

`G10` does not yet have a dedicated gap spec file. Until one exists, use these
sources in this precedence order:

- Normative drivers:
  - [ADR-0004 - Event Sourcing Strategy](../../../adr/ADR-0004-event-sourcing-strategy.md)
  - [Gap Execution Plans - G10 section](../../../planning/gaps/GAP_EXECUTION_PLANS.md)
  - [G6 - OpenLineage CI and Schema Pin Plan](../../../planning/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
- Architectural context:
  - [Traceability Contracts](../../../contracts/traceability/index.md)
  - [System Delivery Status](../../../architecture/system-delivery-status.md)
- Active status docs:
  - [Gap Execution Plans](../../../planning/gaps/GAP_EXECUTION_PLANS.md)
  - [Current Status](../../../architecture/system-delivery-status.md)

This file is not a second source of truth. It records the execution pointer and
the constraints already fixed by accepted ADRs and contracts.

## Current Pointer

- `as_of`: `2026-03-15`
- `gap`: `G10`
- `current_focus`: `closed`
- `state`: `Closed`
- `currently_working_on`: `n/a`
- `next_after_current`: `n/a`
- `blocking_dependencies`: `none`
- `last_completed`: `G10.6 closed 2026-03-15 - evidence doc committed, status docs synced, G10 marked Closed`

## Think-First Analysis

### Problem Statement

`G6` closed mapper and schema validation work, but deferred the delivery and
runtime path. The repository still needed a durable queue, retry path, DLQ, and
standalone host for lineage publication.

### Key Constraints

1. Fail-open: lineage publication must never block domain delivery.
2. Persistent queue: lineage records must survive process restarts.
3. Delivery timing must stay decoupled from the domain outbox worker.
4. `run_seq` is per-run, not a safe global cursor.

### Design Options Evaluated

#### Option A - observer hook only

- Publish inline from the observer
- Rejected: no persistence, no retry, no DLQ

#### Option B - `lineage_outbox` table plus dedicated worker

- Observer enqueues to `lineage_outbox`
- `LineageWorkerRuntime` polls, maps, publishes, retries, and dead-letters
- Selected: matches repo boundaries and gives durable fail-open delivery

#### Option C - watermark over `run_events`

- Worker reads `run_events` directly via global cursor
- Rejected: per-run ordering does not yield a safe global watermark

### Accepted Design

```text
OutboxWorker
  -> OutboxWorkerObserver.onRecordDelivered(record)
       -> LineageOutboxObserver (fail-soft)
            -> ILineageOutboxStore.enqueue(record)
                   v
            lineage_outbox table
                   v
            LineageWorkerRuntime
                   v
            ILineageStepEventMapper.map(event)
                   v
            ILineageSink.publish(runId, facets)
                   v on failure
            markFailed / dead_letter
```

## G10 Roadmap

- `G10.0 / planning` - Done 2026-03-15
- `G10.1 / contracts` - Done 2026-03-15
- `G10.2 / migration + Postgres store` - Done 2026-03-15
- `G10.3 / observer + runtime` - Done 2026-03-15
- `G10.4 / HTTP sink` - Done 2026-03-15
- `G10.5 / standalone worker app` - Done 2026-03-15
- `G10.6 / tests + evidence + closeout` - Done 2026-03-15

## Acceptance Criteria

| #   | Criterion                                                                | Status |
| --- | ------------------------------------------------------------------------ | ------ |
| 1   | `ILineageSink` and `ILineageOutboxStore` exist in `@dvt/contracts`       | YES    |
| 2   | `lineage_outbox` and `lineage_dead_letter` exist as migration `005`      | YES    |
| 3   | `PostgresLineageOutboxStore` implements `ILineageOutboxStore`            | YES    |
| 4   | `LineageOutboxObserver` populates `lineage_outbox` fail-soft             | YES    |
| 5   | `LineageWorkerRuntime` polls, maps, publishes, retries, and dead-letters | YES    |
| 6   | `HttpOpenLineageSink` implements `ILineageSink`                          | YES    |
| 7   | `apps/lineage-worker` provides a standalone process                      | YES    |
| 8   | `lagCount` exists on `LineageWorkerRuntime`                              | YES    |
| 9   | Fail-open semantics keep domain delivery unblocked                       | YES    |
| 10  | The G10 validation lane is green                                         | YES    |

## Execution Log

| Date       | Slice       | Action                                                                                            | Result |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-15 | G10.0       | Think-first analysis completed and Option B selected                                              | YES    |
| 2026-03-15 | G10.1-G10.5 | Contracts, migration, stores, runtime, sink, and app delivered                                    | YES    |
| 2026-03-15 | G10.6       | Delivery, adapter, traceability, and worker validation completed; evidence and status docs synced | YES    |
