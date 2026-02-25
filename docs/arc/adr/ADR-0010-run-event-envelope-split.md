# ADR-0010 — Run Event Envelope Split, Idempotency, and Runtime Integrity Governance (Comprehensive Version)

Status: Approved  
Date: 2026-02-20 (updated: 2026-02-21)

---

## 1. Executive Summary

This ADR formalizes the separation between producer-assigned and store-assigned
event fields, defines canonical idempotency derivation, enforces deterministic
ordering guarantees, and introduces runtime integrity verification and metrics.

The objective is to guarantee:

- Strict append authority
- Deterministic replay
- Idempotent retry safety
- Correct transactional outbox behavior
- Controlled migration toward stricter enforcement

This document expands prior ADR-0010 revisions with deeper justification,
operational safeguards, and formal references.

---

## 2. Architectural Context

The original EventEnvelope mixed producer-controlled and store-controlled fields.
This allowed callers to fabricate ordering metadata (`runSeq`) and weakened the
append-authority boundary.

Distributed systems fail at boundaries, not abstractions.
Without strict authority separation and canonical idempotency rules,
event duplication, replay drift, and outbox inconsistencies emerge.

References:

- Martin Fowler — Event Sourcing  
  https://martinfowler.com/eaaDev/EventSourcing.html
- Transactional Outbox Pattern  
  https://microservices.io/patterns/data/transactional-outbox.html

---

## 3. Core Decisions

## 3.1 Authority Split

Producer Authority:

- RunEventInput

Store Authority:

- runSeq
- persistedAt

Producers MUST NOT fabricate runSeq.

Rationale:
Append authority must remain exclusively in the store to preserve ordering integrity.

---

## 3.2 Ordering Guarantee

Event ordering MUST rely exclusively on runSeq.

Timestamps are informational only.

Reason:
Clock skew and distributed scheduling make timestamps unsafe for causal ordering.

Reference:

- Event Sourcing ordering principles  
  https://martinfowler.com/eaaDev/EventSourcing.html

---

## 4. Idempotency Derivation (Normative)

> **⚠ SUPERSEDED (partial) — 2026-02-21**
>
> The inclusion of `payload` in the hash preimage specified below is **superseded**
> by RunEvents v2.0.1 and `IdempotencyKeyBuilder` v1.0.0.
>
> **Authoritative formula (run events):**
> `SHA256(runId | stepIdOrRUN | logicalAttemptId | eventType | planId | planVersion)`
>
> `payload` is explicitly **excluded** from the hash.
> Rationale: payload field names and serialization can drift across producers and
> schema versions, making payload-inclusion non-deterministic at replay boundaries.
> The logical identity of an event is fully captured by the fields above.
>
> For signal events the authoritative formula is defined in ADR-0008.
>
> The `payload` canonicalization rules in §5 remain informational for other
> uses (e.g., store integrity checksums), but MUST NOT be used in idempotencyKey derivation.

The idempotencyKey MUST be derived from canonical serialization of:

- eventType
- runId
- stepId (if present, otherwise literal `RUN`)
- logicalAttemptId
- planId
- planVersion

~~payload (recursively canonicalized)~~ — **excluded per RunEvents v2.0.1**

The following MUST NOT participate:

- eventId
- emittedAt
- engineAttemptId
- payload (excluded — see supersession note above)
- tenantId (envelope field, not identity field)

Hash algorithm:

- SHA-256 over pipe-delimited field concatenation (not JSON bytes).
  See `IdempotencyKeyBuilder.runEventKey` in `packages/@dvt/engine/src/core/idempotency.ts`.

Rationale:
Provider retries must not create new logical events.
Only logicalAttemptId differentiates domain retries.

Reference:

- Idempotent Receiver Pattern
  https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html
- `IdempotencyKeyBuilder` (normative implementation): `packages/@dvt/engine/src/core/idempotency.ts`
- ADR-0008 (signal idempotency): `docs/adr/ADR-0008_Signal_Idempotency.md`

---

## 5. Canonicalization Rules

Canonicalization MUST:

1. Recursively sort object keys lexicographically.
2. Preserve array order.
3. Recursively canonicalize array elements.
4. Preserve primitive values.
5. Exclude undefined fields.

Array order MUST NOT be modified.

Reference:

- RFC 8785 — JSON Canonicalization Scheme  
  https://www.rfc-editor.org/rfc/rfc8785

---

## 6. Retry Semantics

logicalAttemptId:

- Increments on domain retry.

engineAttemptId:

- Reflects provider-level retry attempts.

Normative rule:
engineAttemptId MUST NOT influence idempotencyKey.

Reason:
Provider retries represent execution retries, not logical domain retries.

---

## 7. Atomic Append Guarantee

appendEventsTx MUST be atomic.

Either:

- All events persist, OR
- None persist.

Partial append is forbidden.

Reference:

- ACID Atomicity  
  https://martinfowler.com/bliki/ACID.html

---

## 8. Dedup-Aware Append API

AppendResult:

- appended[]
- deduped[]

Only appended events are eligible for outbox enqueue.
Deduped events MUST NOT be re-enqueued.

Reference:

- Transactional Outbox Pattern  
  https://microservices.io/patterns/data/transactional-outbox.html

---

## 9. Runtime Idempotency Verification (Optional but Recommended)

The store MAY recompute idempotencyKey and compare with input.

Policy modes:

- off
- warn
- reject

Default during migration: warn.

Rationale:
Allows gradual hardening without breaking legacy producers.

Reference:

- Tolerant Reader Pattern  
  https://martinfowler.com/bliki/TolerantReader.html

---

## 10. Logging & Security Constraints

On mismatch:

MUST log:

- runId
- eventType
- planId
- planVersion
- expectedKeyPrefix
- actualKeyPrefix
- policy mode

MUST NOT log:

- payload
- full idempotency keys
- credentials

Reference:

- OWASP Logging Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

---

## 11. Mismatch Metrics & Governance (Phase 5 Refinement)

To safely transition from warn → reject mode, the system MUST track:

Counters:

- idempotency_append_total
- idempotency_mismatch_total (tagged by policy_mode, event_type)

Ratio (computed in monitoring layer):
mismatch_rate = rate(mismatch_total) / rate(append_total)

Do NOT emit ratio as Gauge directly if using Prometheus.
Compute in query.

Reference:

- Prometheus Best Practices  
  https://prometheus.io/docs/practices/instrumentation/

---

## 11.1 Cutover Policy

Switch from warn → reject ONLY if:

1. mismatch_rate < 0.001 (0.1%)
2. absolute mismatches per day remain low
3. no known legacy producer remains

Recommended stability window: 7 days.

This prevents cascading production failures.

---

## 12. Implementation Phases

Phase 1 — Implement IdempotencyKeyBuilder  
Phase 2 — Migrate producers  
Phase 3 — Introduce warn-mode verification  
Phase 4 — Add contract tests  
Phase 5 — Introduce metrics + cutover policy  
Phase 6 — Optionally switch to reject mode

---

## 13. Acceptance Criteria

- No manual idempotency key construction
- Canonicalization recursively tested
- appendEventsTx atomic
- runSeq strictly monotonic per runId
- Outbox processes appended only
- Provider retries do not generate new logical events
- mismatch metrics available in observability layer
- Cutover policy documented

---

## 14. Architectural Justification Summary

This ADR enforces:

- Clear authority boundaries
- Deterministic replay safety
- Retry semantics clarity
- Outbox correctness
- Gradual production hardening
- Observability-driven enforcement

Without these guarantees, distributed event-driven systems degrade over time.

This specification moves ADR-0010 from conceptual correctness
to operationally enforceable correctness.

---

## 15. ADR Governance Principle

An ADR transitions to Accepted only when:

1. Code matches specification.
2. Tests prove invariants.
3. Monitoring supports enforcement.
4. Migration risks are mitigated.

Reference:

- ADR Methodology  
  https://adr.github.io/
