---
title: Guide — Append Authority & Event Store Semantics
status: Guide
tags: [eventstore, append-authority, ordering, idempotency, outbox]
---

# Append Authority & Event Store Semantics

This guide captures DVT+ specific invariants:

- authoritative vs derived fields
- sequencing ownership
- write-shape guardrails

Use when changes affect:

- RunEvent write/record shape
- outbox/event log persistence
- ordering/idempotency/runSeq assignment
- projection/read-model rules

## 1) Authoritative fields vs derived fields

Authoritative (assigned by Append Authority):

- `runSeq` (per run monotonic sequence)
- `persistedAt` (server-side timestamp)
- storage-level record IDs

Non-authoritative (provided by producer):

- `runId`, `stepId`, `eventType`, `emittedAt`, `idempotencyKey` (if used)

## 2) Write-shape guardrails

- Writes MUST NOT include `runSeq` or `persistedAt`
- Store assigns them atomically
- Duplicate writes are deduped by `(runId, idempotencyKey)` or equivalent configured key

## 3) Ordering semantics

Define ordering scope explicitly:

- per run (recommended)
- per aggregate
- per partition

Never assume global ordering unless enforced.

## 4) Outbox separation

- Domain outbox: guarantees domain event delivery
- Lineage outbox: isolates lineage delivery failures (OpenLineage)

## 5) Projection rules

- Projectors MUST be idempotent
- Read models are derived; the log is authoritative
- Rebuild/read-model replays must be supported (see determinism guide)

References:

- Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
