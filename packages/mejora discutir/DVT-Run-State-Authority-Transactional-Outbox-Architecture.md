# DVT+ Run State Authority + Transactional Outbox

## Consolidated Architecture, ADR, Agreements & Implementation Blueprint

**Status:** LOCKED (MVP Baseline)
**Scope:** Run lifecycle persistence, event log, snapshots, transactional outbox
**Authority:** Postgres
**Pattern:** Event Log + Snapshot + Transactional Outbox

---

# 1. Executive Summary

This document consolidates:

- Locked architectural decisions
- Rationale (WHAT + WHY)
- ADR formalization
- Implementation agreements
- SQL + leasing strategy decisions
- File structure for monorepo integration

This is the canonical reference for implementation.

---

# 2. Locked Decisions (MVP Baseline)

## 2.1 Postgres is State Authority

**Decision**
All run state, lifecycle, ordering and idempotency are persisted in Postgres.

**Why** — Deterministic system behavior — Auditability via append-only event log — Engine independence — Strong consistency guarantees

Engine (Temporal/Conductor) is NOT authoritative.

Reference: https://microservices.io/patterns/data/transactional-outbox.html

---

## 2.2 Synchronous Snapshot Projection

**Decision**
Snapshots are updated inside `appendEventsTx` in the same transaction as event append and outbox enqueue.

**Why** — Immediate read consistency — Simplified debugging — UI reflects committed reality — No early need for async projector service

Tradeoff: slightly heavier write transaction (acceptable for MVP).

Reference: https://martinfowler.com/bliki/CQRS.html

---

## 2.3 Strict Contiguous Outbox Ordering (Batch per Run)

**Decision** — Ordering key = `tenantId:runId` — Leasing enforces contiguous `runSeq` — Batch-per-run leasing is allowed

**Why** — Preserves event sourcing semantics — Guarantees deterministic UI timeline — Supports parallelism across runs — Higher throughput than single-message leasing

`tenant_id` is stored as an explicit column on `outbox` (redundant with `ordering_key` but enables direct tenant-scoped index).

Reference: https://kafka.apache.org/documentation/#intro_guarantees

---

## 2.4 Deterministic runSeq Allocation

**Decision** Use `run_metadata.current_run_seq` row counter with `SELECT ... FOR UPDATE`

**Why** — Prevents race conditions — Avoids MAX(run_seq) scans — Enables optimistic concurrency

Reference: https://www.postgresql.org/docs/current/explicit-locking.html

---

## 2.5 Idempotency Receipts (Recommended)

**Decision** Use `idempotency_receipts` table.

**Why** — Allows multi-event command dedupe — Deterministic duplicate response — Avoids recomputing event ranges

Idempotency index on `run_events` is scoped to `(run_id, idempotency_key)`, not global.
Rationale: dbt stepIds included in keys prevent cross-tenant collision; scoped index is more explicit.

Reference: https://www.postgresql.org/docs/current/sql-insert.html

---

## 2.6 Retry + Backoff + Jitter

**Decision** — Exponential backoff — Add jitter — Cap delay — After N attempts → FAILED_PERMANENT

**Why** — Prevent thundering herd — Production-grade resilience

Reference: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

---

## 2.7 Domain-Oriented Read Model (RunSnapshot)

**Decision**
Public read methods on `IRunStateStore` return domain projections (`RunSnapshot`, `RunStepSnapshot`), not provider-coupled metadata.

Provider fields (`providerWorkflowId`, `providerRunId`, `provider`) are stored in `run_metadata` but **not exposed** through the port. They remain internal to the Postgres adapter.

**Why** — Decouples domain from provider implementation details — UI and API layer depend only on domain types — Allows provider migration without changing consumers

**Migration from existing codebase**
The existing `getRunMetadataByRunId(): Promise<RunMetadata>` is renamed to `getRun(): Promise<RunSnapshot | null>`.
`RunMetadata` becomes an internal row type in the adapter, not a public contract.
`getSnapshot()` is absorbed into `getRun()` (single source of truth for domain state).

---

## 2.8 bootstrapRunTx is a Required Separate Operation

**Decision**
`bootstrapRunTx(cmd: BootstrapRunCmd)` remains a distinct method, separate from `appendEventsTx`.

**Why** (ADR-0013/0014)

- Engine calls `adapter.startRun()` **before** `bootstrapRunTx`.
- If `bootstrapRunTx` fails → `adapter.cancelRun()` as compensation.
- `bootstrapRunTx` includes provider refs (`providerWorkflowId`, `providerRunId`) atomically — eliminates two-phase write gap.

**cancelRunTx does NOT exist** on `IRunStateStore`. Cancellation is expressed as a `RunCancelled` event via `appendEventsTx` (ADR-0007: engine emits intent, adapter emits terminal event).

---

## 2.9 Migration Tooling

**Decision**
Use the existing project convention: SQL plain files applied via `scripts/db-migrate.cjs`.

Files follow the naming pattern `NNN_description.sql` (e.g., `003_run_state_schema.sql`).
No additional migration framework dependency for MVP.

---

# 3. ADR — Run State Authority & Transactional Outbox

## ADR-ID: ADR-RUN-STATE-001

### Context

DVT+ requires:

- Deterministic execution tracking
- Engine independence
- Ordered event distribution
- Reliable message publishing

### Decision

Adopt:

- Append-only event log (`run_events`)
- Synchronous snapshot projection
- Transactional Outbox
- Strict contiguous leasing
- Postgres as append authority
- Domain-oriented `RunSnapshot` as the public projection (not `RunMetadata`)

### Consequences

Positive: — Deterministic replay — Strong consistency — Operational clarity — Engine abstraction preserved — Domain model decoupled from provider

Negative: — Slightly heavier write transactions — More complex lease query — One-time migration of `getRunMetadataByRunId` → `getRun`

Status: ACCEPTED

---

# 4. Core Tables

1. `run_metadata` — seq counter, provider coupling, lifecycle status (internal)
2. `run_events` — append-only log, PK `(run_id, run_seq)`
3. `run_snapshot` — domain projection for fast reads
4. `run_step_snapshot` — per-step domain projection
5. `outbox` — transactional outbox with tenant isolation
6. `idempotency_receipts` — command-level deduplication

---

# 5. bootstrapRunTx — Implementation Flow

Single DB transaction:

1. INSERT `run_metadata` row (with `provider`, `provider_workflow_id`, `provider_run_id`, `logical_attempt_id`)
2. INSERT initial `run_snapshot` row (status = PENDING)
3. Return `AppendResult` with initial `runSeq = 0`

Called by engine **after** `adapter.startRun()` succeeds.
If this fails → engine calls `adapter.cancelRun()` as compensation.

---

# 6. appendEventsTx — Implementation Flow

Single DB transaction:

1. Lock `run_metadata` row (`FOR UPDATE`)
2. Validate `expectedRunSeq` (if provided) — throw `OptimisticConcurrencyError` on mismatch
3. Assign sequential `runSeq` range
4. Insert `run_events` rows
5. Apply projector → upsert `run_snapshot` + `run_step_snapshot`
6. Insert `idempotency_receipt` (if `receiptKey` provided)
7. Insert `outbox` rows (one per event, `ordering_key = tenantId:runId`)
8. UPDATE `run_metadata.current_run_seq`
9. Commit

Atomicity guaranteed. All-or-nothing.

---

# 7. Strict Contiguous Leasing SQL Strategy

Leasing selects only messages where:

- `status IN ('PENDING','FAILED')`
- `next_retry_at <= NOW()`
- no smaller `run_seq` exists for same `ordering_key` in `PENDING/FAILED/LEASED`
- `SKIP LOCKED`
- Batch per run allowed

Ensures strict ordering per run timeline.

---

# 8. Snapshot Rebuild Capability

Administrative operation only.

Process:

1. Delete `run_snapshot` + `run_step_snapshot` for `runId`
2. Read `run_events` ordered by `run_seq`
3. Apply pure projector (`applyEvents`)
4. Upsert snapshot tables
5. Commit

Used for: — Schema evolution — Projection bug fix — Derived field introduction

Reference: https://martinfowler.com/eaaDev/EventSourcing.html

---

# 9. File Structure (Monorepo)

```
packages/
  @dvt/contracts/src/
    ids.ts
    run-status.ts
    artifacts.ts
    run-events.ts
    run-snapshots.ts          ← RunSnapshot, RunStepSnapshot (domain projections)
    commands.ts               ← AppendEventsCmd, BootstrapRunCmd, AppendResult
    errors.ts
    ports/
      run-state-store.ts      ← IRunStateStore (domain-oriented)
      outbox-storage.ts       ← IOutboxStorage
      event-bus.ts            ← IEventBus

  @dvt/adapter-postgres/
    migrations/
      001_init.sql            (existente)
      002_add_claimed_at.sql  (existente)
      003_run_state_schema.sql (nuevo)
      004_outbox.sql          (nuevo)
      005_idempotency_receipts.sql (nuevo)
    src/
      db/sql.ts
      db/tx.ts
      projector/run-projector.ts
      store/postgres-run-state-store.ts
      store/postgres-outbox-storage.ts
      worker/outbox-publisher-worker.ts
      index.ts

  @dvt/engine/
    src/core/WorkflowEngine.ts   ← uses IRunStateStore (bootstrapRunTx + appendEventsTx)
```

---

# 10. Implementation Agreements

1. No engine writes directly to snapshots.
2. No event publishing without persistence.
3. No out-of-order publish allowed.
4. Idempotency enforced at storage level (scoped to `run_id`).
5. Snapshot rebuild is admin-only.
6. Batch-per-run leasing allowed (contiguous only).
7. UI reads from `run_snapshot`, not engine runtime.
8. `cancelRunTx` does not exist — cancellation = `appendEventsTx` with `RunCancelled` event.
9. `getRun()` returns `RunSnapshot` (domain) — provider fields not exposed via port.

---

# 11. Operational Guarantees

- Exactly-once persistence
- At-least-once publish
- Deterministic replay
- Ordered per-run processing
- Horizontal scaling across runs
- Strong consistency inside run boundary

---

# 12. Engine Migration Plan (appendAndEnqueueTx → appendEventsTx)

Single PR, zero coexistence period.

Call sites in `WorkflowEngine.ts` (3 total — lines 425, 458, 520):

- Implement `appendEventsTx` in `PostgresRunStateStore`
- Migrate all 3 call sites to `appendEventsTx`
- Remove `appendAndEnqueueTx` from interface and implementation
- Include OCC integration test

---

# 13. Final Agreement

This document defines the locked MVP baseline for DVT+ run state management and transactional outbox behavior.

All implementation must adhere to this specification.

---

End of consolidated architecture document.
