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
[Gap 5 Event Lifecycle And Archival Design](../planning/archive/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md).

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

- [Gap 5 User Reference](gap-5-user-reference-20260319.md)
- [Gap 5 Event Lifecycle And Archival Design](../planning/archive/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md)
- [Gap 5 Archive Operations Runbook](../runbooks/gap-5-archive-operations-runbook-20260319.md)
- [Gap 5 Domain Design Companion](../planning/archive/proposals/gap-5-domain-design-companion-20260319.md)
