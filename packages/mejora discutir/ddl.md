# DVT+ Run State Authority + Transactional Outbox — Postgres DDL (MVP)

**Baseline:** UUID for `run_id` and `outbox_id`; `bigint` for `run_seq`
**Ordering:** strict contiguous per `ordering_key` (batch-per-run allowed)
**Authority:** Postgres (append-only events + synchronous snapshots + transactional outbox)

References:

- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Postgres row locking / `SKIP LOCKED`: https://www.postgresql.org/docs/current/explicit-locking.html
- `INSERT ... ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html

---

## 1) Migration order and file structure

Migration folder (following existing project convention — SQL plain files applied via `scripts/db-migrate.cjs`):

```
packages/@dvt/adapter-postgres/migrations/
  001_init.sql                  (existente)
  002_add_claimed_at.sql        (existente)
  003_run_state_schema.sql      (nuevo: run_metadata, run_events, run_snapshot, run_step_snapshot)
  004_outbox.sql                (nuevo: outbox + índices)
  005_idempotency_receipts.sql  (nuevo)
```

**Order rationale**

1. `run_metadata` first — anchors the `FOR UPDATE` lock and is FK target for all other tables.
2. `run_events` before snapshots/outbox to keep FK dependencies clean.
3. `outbox` before receipts is optional; receipts can be last.

> All new columns (`logical_attempt_id`, `tenant_id`) are included in the initial
> `CREATE TABLE` statements (greenfield — no production data yet).
> ALTER TABLE migrations are only needed when tables already exist in prod.

---

## 2) `pgcrypto` extension

> Required for `gen_random_uuid()`. Include at the top of `003_run_state_schema.sql`.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 3) `003_run_state_schema.sql` — run_metadata

> One row per run. Holds the **authoritative runSeq counter** (`SELECT ... FOR UPDATE`)
> and the provider-coupling fields (internal — not exposed in domain projections).

```sql
CREATE TABLE IF NOT EXISTS run_metadata (
  run_id                uuid PRIMARY KEY,
  tenant_id             text NOT NULL,
  project_id            text NOT NULL,
  environment_id        text NOT NULL,

  plan_id               text NOT NULL,
  plan_version          text NOT NULL,

  -- Domain lifecycle status. Kept in sync with run_snapshot via appendEventsTx projector.
  status                text NOT NULL CHECK (status IN ('PENDING','RUNNING','FAILED','COMPLETED','CANCELLED')),

  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            text NOT NULL DEFAULT 'system',

  started_at            timestamptz NULL,
  completed_at          timestamptz NULL,

  -- Seq counter: incremented atomically inside appendEventsTx (SELECT ... FOR UPDATE).
  current_run_seq       bigint NOT NULL DEFAULT 0,

  -- Logical attempt counter for retry tracking (Phase 1: always 1).
  -- ADR-0013: included in bootstrapRunTx to eliminate two-phase write gap.
  logical_attempt_id    integer NOT NULL DEFAULT 1,

  -- Provider coupling (internal — not projected to RunSnapshot).
  provider              text NOT NULL,             -- 'temporal' | 'conductor' | 'mock'
  provider_workflow_id  text NOT NULL,
  provider_run_id       text NOT NULL
);

CREATE INDEX IF NOT EXISTS run_metadata_scope_idx
  ON run_metadata (tenant_id, project_id, environment_id, created_at DESC);
```

**Why the index exists**

- `run_metadata_scope_idx` supports list/search of runs in a project/environment without scanning.

---

## 4) `003_run_state_schema.sql` — run_events

> Append-only event log. Primary key `(run_id, run_seq)` guarantees total order per run.

```sql
CREATE TABLE IF NOT EXISTS run_events (
  run_id           uuid NOT NULL REFERENCES run_metadata(run_id) ON DELETE CASCADE,
  run_seq          bigint NOT NULL,

  event_type       text NOT NULL,
  -- step_id is text, NOT uuid: dbt stepIds are arbitrary strings (e.g. "stg_customers").
  step_id          text NULL,
  attempt_id       integer NULL,

  idempotency_key  text NOT NULL,
  payload          jsonb NOT NULL,

  occurred_at      timestamptz NOT NULL,
  persisted_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (run_id, run_seq)
);

-- Write-side dedupe scoped to run. Global unique is avoided to prevent
-- cross-tenant collisions; key format per ADR-0008 already includes runId.
CREATE UNIQUE INDEX IF NOT EXISTS run_events_run_id_idempotency_key_ux
  ON run_events (run_id, idempotency_key);

-- Accelerates timeline reads and snapshot rebuild (ORDER BY run_seq).
CREATE INDEX IF NOT EXISTS run_events_run_id_seq_idx
  ON run_events (run_id, run_seq);
```

**Why these indexes exist**

- `run_events_run_id_idempotency_key_ux`: hard idempotency scoped to run (not global).
- `run_events_run_id_seq_idx`: efficient `ORDER BY run_seq` for UI and rebuild.

---

## 5) `003_run_state_schema.sql` — run_snapshot + run_step_snapshot

> Denormalized domain projections for fast reads. Updated **synchronously** inside `appendEventsTx`.
> These are the public read models — provider fields are NOT stored here.

```sql
CREATE TABLE IF NOT EXISTS run_snapshot (
  run_id           uuid PRIMARY KEY REFERENCES run_metadata(run_id) ON DELETE CASCADE,

  tenant_id        text NOT NULL,
  project_id       text NOT NULL,
  environment_id   text NOT NULL,

  plan_id          text NOT NULL,
  plan_version     text NOT NULL,

  status           text NOT NULL CHECK (status IN ('PENDING','RUNNING','FAILED','COMPLETED','CANCELLED')),

  created_at       timestamptz NOT NULL,
  started_at       timestamptz NULL,
  completed_at     timestamptz NULL,

  current_run_seq  bigint NOT NULL,

  total_steps      integer NOT NULL DEFAULT 0,
  completed_steps  integer NOT NULL DEFAULT 0,
  failed_steps     integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS run_snapshot_scope_idx
  ON run_snapshot (tenant_id, project_id, environment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS run_step_snapshot (
  run_id          uuid NOT NULL REFERENCES run_metadata(run_id) ON DELETE CASCADE,
  -- step_id is text: dbt stepIds are arbitrary strings.
  step_id         text NOT NULL,

  status          text NOT NULL CHECK (status IN ('PENDING','RUNNING','FAILED','COMPLETED','SKIPPED')),
  attempt         integer NOT NULL DEFAULT 0,

  started_at      timestamptz NULL,
  ended_at        timestamptz NULL,

  error_code      text NULL,
  error_message   text NULL,

  artifact_refs   jsonb NOT NULL DEFAULT '[]'::jsonb,

  PRIMARY KEY (run_id, step_id)
);

CREATE INDEX IF NOT EXISTS run_step_snapshot_run_idx
  ON run_step_snapshot (run_id);
```

**Why these indexes exist**

- `run_snapshot_scope_idx`: list runs by scope quickly (tenant + project + env).
- `run_step_snapshot_run_idx`: fetch all steps for a run efficiently.

---

## 6) `004_outbox.sql`

> Transactional outbox. Enqueued within `appendEventsTx`. Leased by publisher workers with `FOR UPDATE SKIP LOCKED`.

```sql
CREATE TABLE IF NOT EXISTS outbox (
  outbox_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation: explicit column (redundant with ordering_key but query-friendly).
  tenant_id        text NOT NULL,

  -- Ordering: tenantId:runId ensures per-run strict ordering + tenant isolation.
  ordering_key     text NOT NULL,
  run_id           uuid NOT NULL REFERENCES run_metadata(run_id) ON DELETE CASCADE,
  run_seq          bigint NOT NULL,

  topic            text NOT NULL,
  payload          jsonb NOT NULL,
  idempotency_key  text NOT NULL,

  -- State machine
  status           text NOT NULL CHECK (status IN ('PENDING','LEASED','FAILED','PUBLISHED','FAILED_PERMANENT')),
  attempts         integer NOT NULL DEFAULT 0,
  next_retry_at    timestamptz NULL,

  -- Leasing
  lease_id         uuid NULL,
  lease_expires_at timestamptz NULL,

  -- Audit
  created_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz NULL,
  last_error       text NULL
);

-- Enforce "one outbox message per (ordering_key, run_seq, topic)" if you want hard-dedupe.
-- Optional; keep OFF if you might publish multiple topics per event.
-- CREATE UNIQUE INDEX IF NOT EXISTS outbox_order_topic_ux
--   ON outbox (ordering_key, run_seq, topic);

-- Ordering reads and contiguity check joins.
CREATE INDEX IF NOT EXISTS outbox_order_idx
  ON outbox (ordering_key, run_seq);

-- Core leasing index: find ready messages in-order per tenant.
-- Partial index reduces bloat and speeds scans.
CREATE INDEX IF NOT EXISTS outbox_tenant_ready_idx
  ON outbox (tenant_id, status, next_retry_at, ordering_key, run_seq)
  WHERE status IN ('PENDING','FAILED');

-- Detect / reclaim expired leases (optional).
CREATE INDEX IF NOT EXISTS outbox_leased_expiry_idx
  ON outbox (lease_expires_at)
  WHERE status = 'LEASED';
```

**Why these indexes exist**

- `outbox_order_idx`: enforces and accelerates `(ordering_key, run_seq)` ordering reads.
- `outbox_tenant_ready_idx`: powers the leasing query (`PENDING/FAILED`) with tenant scoping.
- `outbox_leased_expiry_idx`: reclamation / monitoring of stuck leases.

---

## 7) `005_idempotency_receipts.sql`

> Optional but recommended. Stores deterministic results for duplicate commands (multi-event commands supported).

```sql
CREATE TABLE IF NOT EXISTS idempotency_receipts (
  idempotency_key   text PRIMARY KEY,
  run_id            uuid NOT NULL REFERENCES run_metadata(run_id) ON DELETE CASCADE,

  first_seq         bigint NOT NULL,
  last_seq          bigint NOT NULL,

  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idempotency_receipts_run_idx
  ON idempotency_receipts (run_id);
```

---

## 8) Notes on strict contiguous leasing (batch-per-run)

### Rule

A message is eligible only if there is **no smaller `run_seq`** for the same `ordering_key` that is:

- `PENDING`
- `FAILED` (ready or not ready)
- `LEASED` (in-flight / blocking)

This preserves strict in-order semantics for each run timeline.

### Why batch-per-run is safe

Batching is safe **only if you lease a contiguous range** per `ordering_key` starting at the current minimal eligible `run_seq`.

Reference: Postgres `SKIP LOCKED` semantics
https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS

---

## 9) DDL alignment checklist (for code reviewers)

- [ ] `run_metadata.current_run_seq` is the only run sequence counter
- [ ] `run_metadata.logical_attempt_id` present (DEFAULT 1)
- [ ] `run_metadata.provider` / `provider_workflow_id` / `provider_run_id` present
- [ ] `run_events` PK is `(run_id, run_seq)`
- [ ] `run_events.step_id` is `text`, not `uuid`
- [ ] `run_events` idempotency index is `(run_id, idempotency_key)`, not global
- [ ] `run_step_snapshot.step_id` is `text`, not `uuid`
- [ ] `run_snapshot` and `run_step_snapshot` exist and have scope indexes
- [ ] `outbox.tenant_id` present
- [ ] `outbox` has `outbox_tenant_ready_idx` partial index
- [ ] receipts exist if you want multi-event command dedupe
