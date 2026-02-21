# ADR-0009: Outbox Publication Ordering Guarantees

- **Status**: Proposed (Hardened revB)
- **Date**: 2026-02-21
- **Owners**: Engine Domain / Infrastructure
- **Related**:
  - ADR-0004: Event Sourcing Strategy
  - RunEvents.v2.0.1
  - W3-3: Pagination

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

### 2) Failure and Retries

- Failed events remain in outbox.
- Retries MUST use exponential backoff.
- runSeq MUST NOT advance for failed events.
- Subsequent events for same runId MUST NOT publish until prior succeeds or DLQ policy applies.

### 3) Dead Letter Queue (Strict Stream Integrity Policy)

After N retries (default: 5), an event MUST move to DLQ.

Policy chosen: **Strict stream integrity (no gaps).**

- Events in DLQ preserve runId and runSeq.
- Subsequent events for the same runId MUST NOT publish until DLQ is resolved.
- Operational alert MUST be emitted.
- Replay from DLQ MUST preserve original runSeq and idempotencyKey.

---

## Invariants
- INV-OUTBOX-001: Per-run stream ordered by runSeq
- INV-OUTBOX-002: Concurrent workers cannot reorder same runId
- INV-OUTBOX-003: Publish failure does not advance runSeq
- INV-OUTBOX-004: DLQ preserves original runSeq
- INV-OUTBOX-005: No gaps allowed in per-run stream

---
End of ADR-0009
