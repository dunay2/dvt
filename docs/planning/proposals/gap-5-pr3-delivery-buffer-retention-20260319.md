---
title: Gap 5 PR3 Delivery Buffer Retention
status: Closed
owner: Architecture
last_reviewed: 2026-03-21
planning_type: proposal
---

# Gap 5 PR3 Delivery Buffer Retention

## Goal

Add explicit retention and purge flows for non-authoritative delivery buffers.

## Machine Coordination Header

```yaml
parent_plan: gap-5-event-lifecycle-and-archival-design-20260319
pr_split_id: G5-PR3
scope_type: executable_slice
depends_on:
  - G5-PR1
  - G5-PR2
blocks: []
```

## In Scope

- delivered `outbox` purge
- `outbox_dead_letter` purge
- `lineage_outbox` purge if applicable
- `lineage_dead_letter` purge
- metrics and alerts for retained buffer rows

## Out Of Scope

- `run_events` archival
- restore
- redaction

## Deliverables

1. Purge jobs for delivery buffers.
2. Configurable retention windows by environment.
3. Observability for purge volume and failures.

## Technical Minimum Spec

### Purge eligibility

- delivered outbox row:
  - `delivered_at IS NOT NULL`
  - older than configured retention window
- outbox dead-letter row:
  - older than configured retention window
  - not under investigation hold if holds exist
- lineage dead-letter row:
  - older than configured retention window
  - not under investigation hold if holds exist

### Default retention

- delivered outbox: `7` days
- outbox dead-letter: `30` days
- lineage dead-letter: `30` days

### Metrics minimum set

- `dvt.outbox.retained_rows`
- `dvt.outbox.purged_rows_total`
- `dvt.outbox.purge_failures_total`
- `dvt.dead_letter.retained_rows`
- `dvt.dead_letter.purged_rows_total`
- `dvt.dead_letter.purge_failures_total`

## Acceptance Conditions

- delivered outbox rows are purged by policy
- dead-letter rows are purged by policy
- lineage buffers follow the same explicit lifecycle rule
- purge jobs are batch-based and repeatable
- metrics expose retained rows and purge failures
- purge never touches authoritative `run_events`

## Checklist

| Item                                 | Status | Notes                                                                                                                 |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Delivered outbox purge implemented   | done   | `DeliveryBufferPurger.purge` → `IDeliveryBufferPurgeStore.purgeDeliveredOutbox` (delivered_at IS NOT NULL)            |
| Outbox dead-letter purge implemented | done   | `purgeOutboxDeadLetter` — range DELETE with LIMIT via CTE                                                             |
| Lineage purge implemented            | done   | `purgeLineageDeadLetter`; `lineage_outbox` rows are hard-deleted on delivery — no purge required for that table       |
| Batch cleanup scheduling implemented | done   | `maxRowsPerRun` cap on every purge call; coordinator is fail-soft per buffer                                          |
| Metrics and alerts added             | done   | `dvt.outbox.retained_rows`, `dvt.outbox.purged_rows_total`, `dvt.outbox.purge_failures_total`, `dvt.dead_letter.*`    |
| Retention config documented          | done   | `DEFAULT_DELIVERY_BUFFER_RETENTION` exported; evidence doc `20260321-gap-5-pr3-delivery-buffer-retention-closeout.md` |

## PR Resolution Table

| PR ID    | Planned status | Actual PR | Resolution | Notes                                                   |
| -------- | -------------- | --------- | ---------- | ------------------------------------------------------- |
| `G5-PR3` | proposed       | pending   | closed     | delivery-buffer retention — all deliverables 2026-03-21 |
