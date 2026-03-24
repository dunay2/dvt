# PostgreSQL Adapter Design

## Scope

This package implements real PostgreSQL persistence for:

- `run_metadata`
- `run_events`
- `outbox`
- `run_snapshots`
- `outbox_dead_letter`

The adapter keeps contract compatibility with engine-facing interfaces while replacing all in-memory `Map` state.

## Architecture

Core runtime class:

- [`PostgresStateStoreAdapter`](src/PostgresStateStoreAdapter.ts)

Support modules:

- [`types.ts`](src/types.ts)
- [`sqlUtils.ts`](src/sqlUtils.ts)
- integration tests in [`test/smoke.test.ts`](test/smoke.test.ts)

## Data model

### `run_metadata`

Stores per-run provider metadata and allows upsert by `run_id`.

### `run_events`

Append-only event stream per run:

- primary key: `(run_id, run_seq)`
- unique idempotency key: `(run_id, idempotency_key)`
- canonical event payload persisted as JSONB

### `outbox`

Transactional outbox records used for at-least-once dispatch semantics:

- primary key: `id` (`<runId>:<runSeq>`)
- persisted routing key: `shard_id`
- delivery lifecycle: `attempts`, `last_error`, `claimed_at`, `next_attempt_at`, `delivered_at`
- claim timeout: integer milliseconds only, validated by
  `normalizeOutboxClaimTimeoutMs()` before SQL uses it

### `run_snapshots`

Persisted hot-read snapshot updated in the same transaction as event append.

### `outbox_dead_letter`

Dead-letter storage for outbox records that exceed the max retry budget,
including the persisted `shard_id` needed to replay back into the same topology.

## Transaction semantics

The adapter supports two paths:

1. `bootstrapRunTx()`
2. `appendAndEnqueueTx()`

`bootstrapRunTx()` persists metadata, first events, snapshot, and outbox rows in
one transaction.

`appendAndEnqueueTx()` performs event append + snapshot update + outbox enqueue
in a single DB transaction to preserve atomicity.

Per-run ordering is stabilized with a 64-bit MD5-derived advisory transaction
lock before sequence allocation.

For `G5.5`, enqueue also persists `shard_id` and the claim path supports
`listPendingForClaim(limit, { shardIds })` so workers can restrict selection in
SQL before claim updates happen.

## Idempotency behavior

Insert path for events uses:

- `ON CONFLICT (run_id, idempotency_key) DO NOTHING`

If conflict happens, existing payload is fetched and returned in `deduped`.

## Migrations

The runtime adapter requires `await adapter.migrate()` before use.

Migration support exists both in the package migrations directory and in the
adapter's idempotent `migrate()` path, which also performs compatibility
cleanup and index creation.

The concrete adapter now also exposes:

- `planSchemaRollback(targetVersion)` to inspect the reverse steps needed to
  reach a known schema version
- `rollbackSchemaTo(targetVersion)` to execute those reverse steps under the
  same advisory lock discipline used by forward migrations

Rollback remains a PostgreSQL adapter concern. It is not part of the
engine-facing state-store ports.

Env vars:

- `DATABASE_URL` (required)
- `DVT_PG_SCHEMA` (optional, default `dvt`)

## Testing

Integration tests live in:

- [`test/smoke.test.ts`](test/smoke.test.ts)

Modes:

- default: integration tests skipped
- real DB mode: set `DVT_PG_INTEGRATION=1`

Recommended flow:

```bash
docker compose -f infra/docker/postgres/docker-compose.yml up -d
set DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt
set DVT_PG_SCHEMA=dvt_it
pnpm db:migrate
set DVT_PG_INTEGRATION=1
pnpm --filter @dvt/adapter-postgres test
```
