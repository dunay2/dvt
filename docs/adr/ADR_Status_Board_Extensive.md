# ADR Status Board — DVT+ (Extensive Governance Version)

Date: 2026-02-21

This document tracks the maturity level of architectural decisions
and defines concrete evidence required to transition each ADR to Accepted.

---

## ADR-0010 — Run Event Envelope Split

Status: Pending Implementation

Completion requires:

- IdempotencyKeyBuilder implemented
- Canonicalization formally tested
- Store append atomicity verified
- Outbox processes appended only
- runSeq strictly monotonic per runId
- Replay test suite passes

Architectural Impact:
High — foundational to event correctness

---

## ADR-0011 — RunStarted Ownership

Status: Proposed

Needs verification that:

- Engine emits RunQueued only
- Adapter/workflow emits RunStarted
- Ordering preserved via runSeq
- No duplication on retries

If implementation matches ADR → mark Accepted.

---

## ADR-0012 — Plan Integrity Ownership

Status: Pending Implementation

To close:

- Engine no longer fetches plan bytes
- Adapter validates bytes-level integrity
- Shared plan-verifier exists
- Contract tests cover hash mismatch & schema failure

Architectural Impact:
High — execution trust boundary

---

## ADR-0012a — Canonical Error Code Strategy

Status: Proposed

Next:

- Introduce PlanErrorCode enum in @dvt/contracts
- Map adapter-specific errors
- Contract test canonical emission
- Deprecation window defined

Impact:
Medium — observability consistency

---

## ADR-0013 — bootstrapRunTx

Status: Proposed

Confirm:

- Transactional append + enqueue atomic
- Outbox behavior verified
- Integration test covers crash recovery

Impact:
High — durability & correctness

---

## Governance Principle

An ADR moves to Accepted only when:

1. Code matches normative specification.
2. Tests prove invariants.
3. No known contradictions remain.
4. Evidence links are documented in the ADR.

This prevents “paper architecture” divergence.

Reference:

- Architecture Decision Records (ADR methodology)  
  https://adr.github.io/
