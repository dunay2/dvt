---
title: Gap 5 PR2 Deferred Deletion And Restore
status: Review
owner: Architecture
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 5 PR2 Deferred Deletion And Restore

## Goal

Make archival safe to operate by adding:

- deferred deletion after a grace period
- restore tooling for runs and archive units
- idempotent coordinator execution with leadership/fencing

## Machine Coordination Header

```yaml
parent_plan: gap-5-event-lifecycle-and-archival-design-20260319
pr_split_id: G5-PR2
scope_type: executable_slice
depends_on:
  - G5-PR1
blocks:
  - G5-PR3
```

## In Scope

- `markDeleteEligible` and `dropHotArchiveUnit`
- delete-after-grace worker
- restore run into temp schema
- restore archive unit into temp schema
- optional hot rehydrate admin path
- coordinator leadership and retry rules

## Out Of Scope

- initial exporter and catalog creation
- delivery buffer retention
- redaction behavior

## Deliverables

1. Deferred-delete lifecycle state.
2. Restore command path.
3. Leadership or fencing model for the coordinator.
4. Reentrant retries with persisted batch state.

## Technical Minimum Spec

### Delete-after-grace rule

- only `VERIFIED` archive units may become `DELETE_ELIGIBLE`
- `delete_after = verified_at + deletion_grace_days`
- units in `VERIFY_FAILED` are never delete-eligible

### Restore authorization

- admin-only
- requester identity and reason must be audited
- default target is temporary schema
- hot rehydrate is explicit operator override only

### Restore conflict rule

- no implicit overwrite of live hot data
- if run already exists hot, restore goes to temp target unless overridden

### Leadership default

- lease row in PostgreSQL
- heartbeat-based lease renewal
- timeout-based takeover
- destructive operations re-check lease before execution

## Acceptance Conditions

- verified units are not dropped before grace expiry
- restore of one run is possible from cold storage
- restore of one archive unit is possible into a temporary target
- coordinator can resume failed work without redoing successful export
- leadership model prevents two workers deleting the same unit
- restore path is throttled and audited

## Checklist

| Item                               | Status | Notes                                                                                  |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Delete grace model implemented     | done   | `markDeleteEligibleUnits` + `listDueForDrop` in `IRunArchiveDeleteStore`               |
| Drop worker implemented            | done   | `RunArchiveDeleter.dropEligibleUnits` — lease-guarded, fail-soft per unit              |
| Single-run restore implemented     | done   | `RunArchiveRestorer.restoreRun` — reads NDJSON, filters runId, writes to temp schema   |
| Single-unit restore implemented    | done   | `RunArchiveRestorer.restoreArchiveUnit` — restores all events in unit                  |
| Leadership/fencing implemented     | done   | `PostgresArchiveLeaseStore` — upsert-based acquire, `assertLeaseHeld` before each drop |
| Retry/resume semantics implemented | done   | `markArchiveBatchDropped` upserts drop record; `DROPPED_FROM_HOT` guards re-drop       |
| Operator docs updated              | done   | evidence doc `20260321-gap-5-pr2-deferred-deletion-restore-closeout.md`                |

## PR Resolution Table

| PR ID    | Planned status | Actual PR | Resolution | Notes                                                       |
| -------- | -------------- | --------- | ---------- | ----------------------------------------------------------- |
| `G5-PR2` | proposed       | pending   | closed     | deferred deletion and restore — all deliverables 2026-03-21 |
