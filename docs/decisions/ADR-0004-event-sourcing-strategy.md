# ADR-0004: Event Sourcing Strategy

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture / Data Domain
- **Related files**:
  - [`ADR-0003-execution-model.md`](./ADR-0003-execution-model.md)
  - [`ExecutionSemantics.v2.0.md`](../architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md)
  - [`RunEvents.v2.0.md`](../architecture/engine/contracts/engine/RunEvents.v2.0.md)
  - [`IRunStateStore.v2.0.md`](../architecture/engine/contracts/state-store/IRunStateStore.v2.0.md)

---

## Context

Distributed execution systems must handle:

- retries and duplicate delivery,
- partial failures,
- clock drift,
- concurrent updates,
- strict auditability requirements.

The platform needs a persistence model that is deterministic, replayable, and engine-agnostic.

---

## Decision

Adopt an event-sourced persistence model with append-only log semantics.

### 1) Canonical write model

The write side MUST use an append-only event log with:

- monotonic `runSeq` per `runId`,
- globally unique event identity,
- idempotency uniqueness constraint by `(runId, idempotencyKey)`.

### 2) CQRS separation

Write model and read projections MUST remain separated.

Projectors MUST:

- enforce transition invariants,
- build derived read models,
- support snapshots for performance.

### 3) Storage choice

PostgreSQL is selected as primary storage due to ACID guarantees, operational maturity, and append/query fit.

---

## Consequences

### Positive

- Deterministic replay from immutable history.
- Strong auditability and traceability.
- Natural fit for CQRS projections.

### Trade-offs

- Higher conceptual complexity.
- Increased storage footprint.
- Ongoing projector maintenance overhead.

---

## Acceptance Criteria

1. Event append API enforces append-only + idempotency guarantees.
2. Replay from canonical events reconstructs state deterministically.
3. Read projections are generated from events, not direct mutable writes.
4. Tenant isolation is enforced in event and projection queries.

---

## References

- [`ADR-0003-execution-model.md`](./ADR-0003-execution-model.md)
- Event sourcing pattern: <https://martinfowler.com/eaaDev/EventSourcing.html>
- PostgreSQL docs: <https://www.postgresql.org/docs/>
