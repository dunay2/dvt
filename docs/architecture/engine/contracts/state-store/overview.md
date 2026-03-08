---
title: State Store Overview
status: Canonical Overview
canonical: true
last_reviewed: 2026-03-08
owner: engine
---

# State Store Overview

This document is the canonical overview for the DVT+ state-store boundary.

It explains the responsibilities, invariants, and behavioral rules that remain
stable across implementations. It does not replace accepted ADRs, live
TypeScript ports, or implementation code.

## Canonical Sources

Use this topic in the following precedence order:

1. [`docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`](../../../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
2. [`packages/@dvt/engine/src/ports/IRunStateStore.ts`](../../../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
3. [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
4. [`docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md`](../../adapters/state-store/postgres/StateStoreAdapter.md)

If this overview conflicts with accepted ADRs or code, ADRs and code win.

## Architectural Role

The state store is the persistence authority behind execution.

It is the boundary that makes run state durable, replayable, tenant-scoped, and
observable beyond process memory. The engine executes plans, but does not
become the source of truth for run state. The UI reflects persisted state, not
ephemeral runtime memory.

## Responsibilities

The state store is responsible for:

- persisting run metadata;
- persisting immutable ordered run events;
- assigning authoritative persistence metadata such as `runSeq` and
  `persistedAt`;
- exposing event replay;
- exposing the latest materialized snapshot for hot reads;
- enforcing semantic idempotency;
- preserving tenant-safe reads and writes;
- atomically coupling persisted events with outbox records.

## Non-goals

The state store does not:

- plan workflows or evaluate planning policy;
- execute provider runtimes;
- own orchestration logic beyond persistence semantics;
- act as a business read-model service by itself;
- replace a message broker;
- turn the outbox into a general event bus.

The outbox exists to preserve atomic delivery intent at the persistence
boundary, not to become a standalone messaging platform.

## Invariants

These rules are canonical and should be treated as review gates:

1. The event log is append-only.
2. Ordering is monotonic per `runId`.
3. `(runId, runSeq)` is unique.
4. Semantic duplicates for the same idempotency key do not create new events.
5. Persisted write metadata is assigned by the store, not by callers.
6. Event append and outbox enqueue are atomic within the contract boundary.
7. Snapshots are derived from persisted events.
8. Snapshots may lag, but must remain consistent with a prefix of the event log.
9. Tenant scope is mandatory on reads and writes.
10. Provider or runtime outages must not erase persisted-state visibility.

## Transaction Model

Two transaction paths are part of the baseline:

- `bootstrapRunTx`
- `appendAndEnqueueTx`

`bootstrapRunTx` must atomically persist:

- `run_metadata`,
- the first persisted events,
- outbox rows for the newly appended events.

`appendAndEnqueueTx` must atomically:

- append new events,
- deduplicate by idempotency key,
- enqueue outbox rows only for newly appended events.

Partial success between persist and enqueue is not acceptable inside this
boundary.

## Snapshot Semantics

Snapshots are read acceleration only.

They are allowed to optimize:

- `getRunStatus`,
- dashboard reads,
- list and filter reads,
- operator views.

They are not the source of truth over the append-only event log.

Operational rules:

- missing snapshot is valid;
- callers must support replay fallback when snapshot is missing;
- snapshot rebuild must be deterministic from persisted ordered events;
- hot read paths should prefer `getSnapshot()`;
- recovery and rebuild paths may fall back to `listEvents()`.

## Tenant Isolation

Tenant isolation is mandatory at the storage boundary.

Minimum expectations:

- tenant scope is required on all read paths;
- write paths must persist tenant identifiers consistently;
- adapter methods must reject or isolate cross-tenant access;
- database-level enforcement such as RLS is preferred where available;
- admin and recovery tooling must remain tenant-scoped.

## Failure Model

The baseline failure posture is:

- duplicate logical retries must not create duplicate persisted events;
- provider dispatch and persistence can fail independently and must be
  reconciled explicitly;
- crash between append and enqueue must be prevented by transactional atomicity;
- missing snapshot degrades to replay, not incorrect behavior;
- provider unavailability must not block reads over already persisted state.

## Physical Naming And Implementation Notes

Conceptual documentation may speak in logical terms such as "snapshot store" or
"outbox". Implementation documentation must use the real physical names from
the active adapter and schema.

For the current Postgres implementation, the relevant physical tables include:

- `run_snapshots`
- `outbox`
- `outbox_dead_letter`

Renames for conceptual neatness are not documentation changes. They are schema
migration work and should be justified as such.

## Operational Backlog Worth Keeping

These themes remain valid backlog candidates even though older inbox packs are
not canonical:

- snapshot rebuild tooling;
- replay certification tests;
- retention and archival policy;
- index and partitioning review;
- outbox lag metrics;
- operational dashboards;
- recovery runbooks.

## Related Working Material

Non-canonical but useful curation material:

- [`docs/archive/working-notes/state-store-extraction.md`](../../../../archive/working-notes/state-store-extraction.md)
