---
title: Gap 5 User Reference
status: Review
owner: Architecture / Operations
last_reviewed: 2026-03-19
---

# Gap 5 User Reference

## Purpose

Provide one consultable reference for people who need to understand the Gap 5
solution without reading every proposal and PR slice.

This is the shortest complete reading surface for:

- operators
- reviewers
- support engineers
- developers integrating with lifecycle behavior

## What Gap 5 Solves

Gap 5 gives DVT a governed lifecycle for stored execution history:

- recent history stays in hot PostgreSQL
- old terminal history moves to cold object storage
- terminal snapshots remain queryable in warm storage
- delivery buffers are cleaned with their own short-lived retention rules
- restore is possible when deeper investigation is required

## The Core Rule

**DVT archives domain history. It does not compact it away.**

That means:

- `run_events` remain authoritative
- snapshots speed up reads but do not replace event history
- deletion from hot storage only happens after export, verification, and grace

## Tier Model

| Tier   | What it contains                                   | What it is for                              |
| ------ | -------------------------------------------------- | ------------------------------------------- |
| `hot`  | active event history and recent runs               | execution, replay, recent operational reads |
| `warm` | pinned terminal snapshots and archive catalog rows | fast status reads for older terminal runs   |
| `cold` | full archived event history in object storage      | compliance, forensics, exceptional restore  |

## What This Resembles In Proven Systems

| DVT concern                         | Mature precedent                   | What we borrow                            | What stays custom                   |
| ----------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------- |
| event history remains authoritative | EventStoreDB / Kurrent             | append-only discipline                    | DVT run semantics                   |
| hot plus cold lifecycle             | Temporal, Confluent tiered storage | export to object storage, finite hot tier | catalog, policy, snapshots, restore |
| PostgreSQL partition mechanics      | `pg_partman`                       | partition maintenance patterns            | DVT archive-unit semantics          |
| delivery buffer pattern             | Debezium outbox                    | operational buffer discipline             | DVT outbox and DLQ governance       |

## What Can Be Reused

- `pg_partman` for partition management and retention mechanics
- object storage and Parquet tooling for export format and storage
- Debezium ideas for outbox cleanup discipline

## What Must Stay DVT-Specific

- archive catalog semantics
- per-tenant retention policy resolution
- terminal snapshot pinning rules
- restore authorization and recovery path
- the distinction between `run_events` and delivery buffers

## Governance Documents

Read these in order if you need more than this summary:

1. [ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model](../adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)
2. [ADR-0038 - Delivery Buffer Retention and Purge Policy](../adr/ADR-0038-delivery-buffer-retention-and-purge-policy.md)
3. [Gap 5 Event Lifecycle And Archival Design](../planning/archive/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md)
4. [Gap 5 Operator Guide](./gap-5-operator-guide-20260319.md)
5. [Gap 5 Archive Operations Runbook](../runbooks/gap-5-archive-operations-runbook-20260319.md)

## PR Breakdown

| PR       | Purpose                       |
| -------- | ----------------------------- |
| `G5-PR1` | minimal usable archival       |
| `G5-PR2` | deferred deletion and restore |
| `G5-PR3` | delivery-buffer retention     |
| `G5-PR4` | redaction ADR and follow-up   |

## Common Questions

### Are archived runs deleted?

No. Their hot copy may be removed later, but the authoritative event history is
preserved in cold storage.

### Can normal product reads fetch full archived history?

Not by default. Normal reads use hot state or warm terminal snapshots.

### When is restore used?

When audit, forensics, or exceptional recovery requires access to archived
event sequences.

### Is outbox history part of the authoritative run history?

No. Outbox and dead-letter tables are operational buffers and follow separate
retention rules.

## Related

- [Gap 5 Domain Design Companion](../planning/archive/proposals/gap-5-domain-design-companion-20260319.md)
- [Gap 5 Sequence And Module Design](../planning/archive/proposals/gap-5-sequence-and-module-design-20260319.md)
