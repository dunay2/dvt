---
title: Gap 5 Operator Guide
status: Review
owner: Architecture / Operations
last_reviewed: 2026-03-19
---

# Gap 5 Operator Guide

## Purpose

Explain how operators and platform users should understand the Gap 5 lifecycle
model once it is implemented.

This is a user-facing operations guide, not the architecture-of-record. For the
design source, use
[ADR-0037 — Run Event Lifecycle, Archival, Verification, and Restore](../adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md).

## Audience

- platform operators
- support engineers
- incident responders
- developers consuming archived-run behavior through API and admin tooling

## Core Mental Model

DVT stores run history in three tiers:

- `hot`: recent authoritative history in PostgreSQL
- `warm`: pinned terminal snapshots plus archive catalog metadata
- `cold`: authoritative long-term event history in object storage

For most users, the important behavior is:

- recent runs are read from hot storage
- old terminal runs are read from pinned snapshots
- cold archive is used for recovery, audit, and deep investigation

## What Users Should Expect

### Normal run queries

- active or recent runs resolve from hot PostgreSQL state
- older terminal runs resolve from pinned terminal snapshots
- normal product queries do not fetch full archived event history by default

### Archived runs

An archived run should still be:

- visible by identity
- visible by terminal status
- traceable to its archive location through admin tooling

An archived run should not assume:

- full event-by-event browsing on the default hot API path
- instant restore into hot storage without authorization

### Restore behavior

Restore is an exceptional admin operation.

Default behavior:

- restore goes to a temporary target
- operator inspects restored data there
- hot rehydrate requires explicit operator intent

## Lifecycle States

Archive-unit states are:

- `LIVE`
- `ELIGIBLE`
- `EXPORTED`
- `VERIFY_FAILED`
- `VERIFIED`
- `DELETE_ELIGIBLE`
- `DROPPED_FROM_HOT`

Practical meaning:

- `LIVE`: still only in hot storage
- `ELIGIBLE`: selected for lifecycle processing
- `EXPORTED`: archive object written, verification pending
- `VERIFY_FAILED`: do not trust deletion path; operator review needed
- `VERIFIED`: archive integrity checks passed
- `DELETE_ELIGIBLE`: grace timer started
- `DROPPED_FROM_HOT`: hot copy removed, archive remains authoritative

## Day-To-Day Operator Tasks

### Check whether archival is healthy

Look at:

- export success rate
- verification lag
- count of `VERIFY_FAILED`
- count of `DELETE_ELIGIBLE` units waiting for grace expiry
- retained rows in outbox and dead-letter tables

### Investigate an old run

Default approach:

1. query pinned terminal snapshot
2. inspect archive catalog metadata
3. restore to temporary target only if deeper inspection is required

### Handle verification failures

If an archive unit is `VERIFY_FAILED`:

1. do not delete it from hot storage
2. inspect manifest and object-store accessibility
3. retry verification or re-export through admin tooling

## User Rules

- Do not treat archived runs as deleted runs.
- Do not request restore for routine status inspection when a pinned snapshot is
  enough.
- Do not assume restore writes back into hot storage automatically.
- Do not use outbox or dead-letter tables as substitutes for authoritative run
  history.

## Metrics To Watch

- `dvt.archive.units_exported_total`
- `dvt.archive.units_verified_total`
- `dvt.archive.units_delete_eligible_total`
- `dvt.archive.export_failures_total`
- `dvt.archive.verify_failures_total`
- `dvt.archive.restore_duration_ms`
- `dvt.outbox.retained_rows`
- `dvt.dead_letter.retained_rows`

## Related Documents

- [Gap 5 User Reference](gap-5-operator-guide-20260319.md#section-gap-5-user-reference-20260319)
- [Gap 5 Archive Operations Runbook](gap-5-operator-guide-20260319.md#section-gap-5-archive-operations-runbook-20260319)

<a id="section-gap-5-user-reference-20260319"></a>

## Gap 5 User Reference

### Purpose

Provide one consultable reference for people who need to understand the Gap 5
solution without reading every proposal and PR slice.

This is the shortest complete reading surface for:

- operators
- reviewers
- support engineers
- developers integrating with lifecycle behavior

### What Gap 5 Solves

Gap 5 gives DVT a governed lifecycle for stored execution history:

- recent history stays in hot PostgreSQL
- old terminal history moves to cold object storage
- terminal snapshots remain queryable in warm storage
- delivery buffers are cleaned with their own short-lived retention rules
- restore is possible when deeper investigation is required

### The Core Rule

**DVT archives domain history. It does not compact it away.**

That means:

- `run_events` remain authoritative
- snapshots speed up reads but do not replace event history
- deletion from hot storage only happens after export, verification, and grace

### Tier Model

| Tier   | What it contains                                   | What it is for                              |
| ------ | -------------------------------------------------- | ------------------------------------------- |
| `hot`  | active event history and recent runs               | execution, replay, recent operational reads |
| `warm` | pinned terminal snapshots and archive catalog rows | fast status reads for older terminal runs   |
| `cold` | full archived event history in object storage      | compliance, forensics, exceptional restore  |

### What This Resembles In Proven Systems

| DVT concern                         | Mature precedent                   | What we borrow                            | What stays custom                   |
| ----------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------- |
| event history remains authoritative | EventStoreDB / Kurrent             | append-only discipline                    | DVT run semantics                   |
| hot plus cold lifecycle             | Temporal, Confluent tiered storage | export to object storage, finite hot tier | catalog, policy, snapshots, restore |
| PostgreSQL partition mechanics      | `pg_partman`                       | partition maintenance patterns            | DVT archive-unit semantics          |
| delivery buffer pattern             | Debezium outbox                    | operational buffer discipline             | DVT outbox and DLQ governance       |

### What Can Be Reused

- `pg_partman` for partition management and retention mechanics
- object storage and Parquet tooling for export format and storage
- Debezium ideas for outbox cleanup discipline

### What Must Stay DVT-Specific

- archive catalog semantics
- per-tenant retention policy resolution
- terminal snapshot pinning rules
- restore authorization and recovery path
- the distinction between `run_events` and delivery buffers

### Governance Documents

Read these in order if you need more than this summary:

1. [ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model](../adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)
2. [ADR-0038 - Delivery Buffer Retention and Purge Policy](../adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md)
3. [Gap 5 Operator Guide](gap-5-operator-guide-20260319.md)
4. [Gap 5 Archive Operations Runbook](gap-5-operator-guide-20260319.md#section-gap-5-archive-operations-runbook-20260319)

### PR Breakdown

| PR       | Purpose                       |
| -------- | ----------------------------- |
| `G5-PR1` | minimal usable archival       |
| `G5-PR2` | deferred deletion and restore |
| `G5-PR3` | delivery-buffer retention     |
| `G5-PR4` | redaction ADR and follow-up   |

### Common Questions

#### Are archived runs deleted?

No. Their hot copy may be removed later, but the authoritative event history is
preserved in cold storage.

#### Can normal product reads fetch full archived history?

Not by default. Normal reads use hot state or warm terminal snapshots.

#### When is restore used?

When audit, forensics, or exceptional recovery requires access to archived
event sequences.

#### Is outbox history part of the authoritative run history?

No. Outbox and dead-letter tables are operational buffers and follow separate
retention rules.

> Section status: Review. Owner: Architecture / Operations. Colocation does not merge component responsibilities.

<a id="section-gap-5-archive-operations-runbook-20260319"></a>

## Gap 5 Archive Operations Runbook

### Purpose

Operational procedure for archive export, verification failure, restore, and
delete-after-grace workflows.

### Preconditions

- archive catalog available
- lifecycle leadership working
- metrics available
- admin authorization in place for restore and override actions

### Routine Checks

Daily checks:

1. no backlog growth in `ELIGIBLE`
2. no stale `EXPORTED` units beyond verification SLA
3. no unexpected `VERIFY_FAILED` growth
4. delete-eligible units progressing after grace expiry
5. delivery-buffer retained rows within expected envelope

### Procedure: Verification Failure

1. Identify the `archiveUnitKey`.
2. Confirm object presence and manifest presence.
3. Compare manifest row count and checksum against catalog state.
4. Retry verification if failure cause is transient.
5. Re-export only if manifest or object is invalid.
6. Do not allow deletion while unit remains `VERIFY_FAILED`.

### Procedure: Restore One Run

1. Confirm operator authorization and reason.
2. Resolve archive location from catalog.
3. Restore to temporary target by default.
4. Validate restored row count and sequence continuity.
5. Hand over temporary target to investigator.

### Procedure: Restore One Archive Unit

1. Confirm operator authorization.
2. Restore archive unit to temporary schema.
3. Validate manifest, row count, and `run_seq` continuity.
4. Use hot rehydrate only if explicitly approved.

### Procedure: Delete After Grace

1. Confirm archive unit state is `VERIFIED`.
2. Confirm grace window elapsed.
3. Re-check leadership before destructive action.
4. Drop hot archive unit.
5. Record `DROPPED_FROM_HOT` in catalog.

### Stop Conditions

Pause lifecycle processing if:

- verification failure rate spikes
- object storage access is degraded
- leadership ownership flaps
- restore operations saturate system capacity

### Related Documents

- [Gap 5 Operator Guide](gap-5-operator-guide-20260319.md)

> Section status: Review. Owner: Architecture / Operations. Colocation does not merge component responsibilities.
