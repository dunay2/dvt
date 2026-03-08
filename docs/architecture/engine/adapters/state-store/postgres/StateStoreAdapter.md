# Postgres State Store Adapter

**Status**: Implementation Guide
**Backend**: PostgreSQL 14+
**Type**: Code-aligned documentation
**Contract Entry Point**: [State Store Docs](../../../contracts/state-store/README.md)

> WARNING
> This guide documents the current adapter implementation.
> The authoritative sources are:
> `packages/@dvt/engine/src/ports/IRunStateStore.ts`,
> `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`,
> and accepted ADRs such as `ADR-0013`.
> If this guide diverges from code or ADRs, code and ADRs win.

---

## Purpose

This document describes the current PostgreSQL implementation of the DVT+
state-store boundary.

It is intentionally narrower than older adapter specs:

- it documents the adapter that exists today;
- it does not propose alternative physical designs;
- it does not act as a generic Postgres event-sourcing cookbook.

## Canonical Implementation References

- [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- [`packages/@dvt/adapter-postgres/src/types.ts`](../../../../../packages/@dvt/adapter-postgres/src/types.ts)
- [`packages/@dvt/adapter-postgres/test/smoke.test.ts`](../../../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)
- [`docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`](../../../../../docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md)

## Runtime Baseline

The adapter currently implements:

- `bootstrapRunTx`
- `appendAndEnqueueTx`
- `getRunMetadataByRunId`
- `listRuns`
- `listEvents`
- `getSnapshot`
- outbox worker storage methods:
  `listPending`, `markDelivered`, `markFailed`, `listDeadLetter`,
  `replayDeadLetters`

The adapter must be explicitly migrated before use:

```ts
const adapter = new PostgresStateStoreAdapter({ schema: 'dvt' });
await adapter.migrate();
```

Constructor-time DDL is intentionally disabled. Migration is a separate,
idempotent step.

## Current Physical Objects

The adapter manages five primary tables.

### `run_metadata`

Purpose:

- durable per-run metadata and provider references

Key fields:

- `run_id` primary key
- `tenant_id`
- `project_id`
- `environment_id`
- `plan_id`
- `plan_version`
- provider reference fields
- `created_at`

### `run_events`

Purpose:

- append-only persisted event log

Key fields:

- `run_id`
- `run_seq`
- `event_type`
- `emitted_at`
- `tenant_id`
- `project_id`
- `environment_id`
- `engine_attempt_id`
- `logical_attempt_id`
- `plan_id`
- `plan_version`
- `persisted_at`
- `step_id`
- `idempotency_key`
- `payload JSONB`

Constraints:

- primary key `(run_id, run_seq)`
- unique `(run_id, idempotency_key)`

### `outbox`

Purpose:

- transactional delivery queue for newly appended events

Key fields:

- `id` primary key, currently `<runId>:<runSeq>`
- `run_id`
- `run_seq`
- `created_at`
- `idempotency_key`
- `payload JSONB`
- `attempts`
- `last_error`
- `claimed_at`
- `next_attempt_at`
- `delivered_at`

### `run_snapshots`

Purpose:

- persisted hot-read snapshot materialized by the adapter itself

Key fields:

- `run_id` primary key
- `snapshot JSONB`
- `last_run_seq`
- `updated_at`

### `outbox_dead_letter`

Purpose:

- exhausted outbox records retained for operator recovery flows

Key fields:

- `id`
- `original_id`
- `run_id`
- `payload JSONB`
- `last_error`
- `dead_lettered_at`

## Migration Behavior

`migrate()` currently:

- ensures the schema exists;
- creates the five primary tables if missing;
- adds compatibility columns such as `claimed_at`, `next_attempt_at`,
  `plan_id`, `plan_version`, and `persisted_at` if they are absent;
- removes obsolete compatibility artifacts such as an old redundant outbox
  uniqueness constraint and stale indexes;
- creates the active indexes used by the adapter.

Important active indexes:

- `outbox_pending_idx`
- `outbox_dead_letter_run_id_idx`
- `run_metadata_tenant_created_idx`

This guide does not duplicate the full DDL. The authoritative DDL lives in
`PostgresStateStoreAdapter.ts`.

## Transaction Model

The adapter has two canonical write paths.

### `bootstrapRunTx`

Single transaction that:

1. sets tenant context,
2. inserts `run_metadata`,
3. appends the first events,
4. updates `run_snapshots`,
5. enqueues outbox rows for appended events.

Duplicate `run_id` fails deterministically as `RUN_ALREADY_EXISTS`.

### `appendAndEnqueueTx`

Single transaction that:

1. resolves tenant from `run_metadata`,
2. sets tenant context,
3. appends events with idempotency handling,
4. updates `run_snapshots`,
5. enqueues outbox rows for newly appended events only.

This is the main steady-state append path.

## Ordering And Idempotency

Per-run ordering is implemented with a transaction-scoped advisory lock:

- `pg_advisory_xact_lock(('x' || left(md5(runId), 16))::bit(64)::bigint)`

Within that lock, the adapter:

1. reads `MAX(run_seq)` for the run,
2. assigns the next sequence values in memory,
3. inserts each event with `ON CONFLICT (run_id, idempotency_key) DO NOTHING`.

If an insert is skipped because the idempotency key already exists, the adapter
reads the existing persisted payload and returns it in `deduped`.

The current adapter does not use:

- one Postgres sequence per run;
- trigger-based sequencing;
- materialized-view refresh for snapshots.

Older docs that describe those patterns should be treated as historical.

## Snapshot Semantics

The adapter performs snapshot write-through inside the same transaction as event
append.

Current behavior:

- bootstrap creates or seeds a `PENDING` snapshot;
- appended events are applied in memory through adapter-local event handlers;
- the snapshot is upserted into `run_snapshots`;
- `getSnapshot()` reads the persisted JSON snapshot;
- when a snapshot is missing, callers are still expected to support replay
  fallback via the higher-level state-store contract.

This means the adapter currently uses a persisted table, not:

- a materialized view;
- a database trigger projector;
- a standalone snapshot service.

## Tenant Isolation

Tenant isolation is enforced in two layers.

### Query-layer scoping

User-facing read methods use tenant predicates directly:

- `getRunMetadataByRunId(tenantId, runId)`
- `listRuns({ tenantId, ... })`
- `listEvents(tenantId, runId, ...)`
- `getSnapshot(tenantId, runId)`
- dead-letter admin methods require `tenantId`

Cross-tenant reads return empty or null results rather than leaking data.

### Transaction-local tenant context

Write transactions set `dvt.tenant_id` with `set_config(..., true)`:

- `bootstrapRunTx`
- `appendAndEnqueueTx`
- `replayDeadLetters`

This is the hook used when RLS policies are active. The setting is transaction
local and does not leak across pooled connections.

## Outbox Lifecycle

The outbox implementation is part of the adapter, not a separate service.

### Claiming pending work

`listPending(limit)`:

- selects undelivered rows whose retry time is due;
- ignores rows still under claim lease;
- orders by `created_at ASC`;
- uses `FOR UPDATE SKIP LOCKED`;
- sets `claimed_at` in the same transaction.

Stale claims are considered expired after five minutes.

### Success path

`markDelivered(ids)`:

- sets `delivered_at`;
- clears `claimed_at`.

### Failure path

`markFailed(id, error)`:

- increments `attempts`;
- stores `last_error`;
- computes exponential backoff via `next_attempt_at`;
- clears `claimed_at`.

When attempts reach `MAX_OUTBOX_ATTEMPTS` (currently `10`), the record is moved
to `outbox_dead_letter` and deleted from `outbox`.

### Recovery path

`replayDeadLetters({ tenantId, runId?, ids?, limit? })`:

- requires tenant scope;
- re-inserts selected dead letters into `outbox`;
- resets delivery state;
- deletes replayed rows from `outbox_dead_letter`.

## Deprecated Paths

These methods still exist but are explicitly not the preferred baseline:

- `saveRunMetadata`
- `appendEventsTx`

They bypass parts of the canonical atomic path and are documented in code as
deprecated. New work should anchor on `bootstrapRunTx` and
`appendAndEnqueueTx`.

## Verification

The most useful executable reference for this guide is the live integration
suite:

- [`packages/@dvt/adapter-postgres/test/smoke.test.ts`](../../../../../packages/@dvt/adapter-postgres/test/smoke.test.ts)

That suite covers:

- bootstrap atomicity;
- idempotent append behavior;
- snapshot write-through;
- cancellation snapshot semantics;
- outbox claim and delivery flow;
- backoff and dead-letter behavior;
- dead-letter replay;
- tenant-scoped reads and admin operations.
