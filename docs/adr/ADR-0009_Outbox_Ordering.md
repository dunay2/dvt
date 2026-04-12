# ADR-0009: Outbox Publication Ordering Guarantees

- **Status**: Proposed (Hardened revB)
- **Date**: 2026-02-21
- **Owners**: Engine Domain / Infrastructure
- **Related**:
  - ADR-0004: Event Sourcing Strategy
  - RunEvents.v1 (runSeq as ordering attribute)
  - W3-3: Outbox pagination (large runs may require paginated replay to rebuild order)

---

## Context

The transactional outbox ensures atomic persistence of state and events.

Publication is asynchronous and may fail.

Without ordering guarantees:

- Projectors may receive events out of order
- Derived state may become corrupt

Without a DLQ:

- Poison events block processing indefinitely

---

## Decision

### 1) Ordering

- Ordering key: `runId`
- Ordering attribute: `runSeq`

Events for the same runId MUST be published in strictly increasing runSeq order.

Cross-run ordering is NOT required.

### 2) Concurrent Worker Ordering Mechanism

INV-OUTBOX-002 (concurrent workers cannot reorder same runId) MUST be
enforced by one of the following mechanisms:

**Option A â€” Partition-based routing (normative for Phase 1):**

- Outbox workers are assigned non-overlapping `runId` partitions using
  consistent hashing: `workerShard = hash(runId) % N`.
- A given runId is always processed by a single worker shard.
- No cross-shard coordination needed.

**Option B â€” Row-level locking (single-table PostgreSQL):**

- Worker queries: `SELECT ... WHERE processed = false ORDER BY runSeq
FOR UPDATE SKIP LOCKED`.
- Combined with `runId`-based exclusive locks ensures single-consumer
  per runId at any time.

Phase 1 MUST use Option A or Option B. Mixed deployments MUST NOT mix
strategies for the same outbox table. The chosen mechanism MUST be
documented in the deployment configuration.

### 3) Failure and Retries

- Failed events remain in outbox.
- Retries MUST use exponential backoff.
- runSeq MUST NOT advance for failed events.
- Subsequent events for same runId MUST NOT publish until prior succeeds or DLQ policy applies.

### 4) Dead Letter Queue (Strict Stream Integrity Policy)

After N retries (default: 5), an event MUST move to DLQ.

Policy chosen: **Strict stream integrity (no gaps).**

- Events in DLQ preserve runId and runSeq.
- Subsequent events for the same runId MUST NOT publish until DLQ is resolved.
- Operational alert MUST be emitted.
- Replay from DLQ MUST preserve original runSeq and idempotencyKey.

---

## Consequences

### Positive

- Guarantees at-least-once ordered delivery per runId without global sequencing.
- DLQ policy prevents silent data loss while avoiding indefinite blocking.
- Partitioned or locked workers allow safe horizontal scaling.

### Negative / Trade-offs

- DLQ strict mode blocks all subsequent events for a runId until resolved â€”
  requires operational process for DLQ triage.
- Partition-based routing requires N to be stable (resharding pauses publication).
- "N retries = 5 (default)" is implementation-configured; this ADR does not
  mandate a specific configuration mechanism (env var, config file, etc.).
  Implementors MUST document the knob in their deployment guide.

---

## Invariants

- INV-OUTBOX-001: Per-run stream ordered by runSeq
- INV-OUTBOX-002: Concurrent workers cannot reorder same runId (enforced by Â§2 mechanism)
- INV-OUTBOX-003: Publish failure does not advance runSeq
- INV-OUTBOX-004: DLQ preserves original runSeq and idempotencyKey
- INV-OUTBOX-005: No gaps allowed in per-run stream (strict stream integrity policy)

## Required Tests (mandatory CI)

- `test/outbox/ordering-per-runid.test.ts` â€” events arrive in runSeq order per runId
- `test/outbox/concurrent-workers-no-reorder.test.ts` â€” simulate two workers, assert no reorder
- `test/outbox/dlq-preserves-run-seq.test.ts` â€” DLQ entry retains original runSeq and idempotencyKey
- `test/outbox/failed-publish-blocks-subsequent.test.ts` â€” subsequent events for same runId are not published before failed one resolves

---

End of ADR-0009
