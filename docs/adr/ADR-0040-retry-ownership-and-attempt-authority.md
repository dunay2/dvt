---
title: ADR-0040 - Retry Ownership and Attempt Authority
status: Accepted
owner: Architecture / Engine / Planner
last_reviewed: 2026-03-24
---

# ADR-0040 - Retry Ownership and Attempt Authority

## Status

Accepted.

## Context

The 2026-03-24 architectural review identified `S09` as an unresolved
authority gap:

- `engineAttemptId` and `logicalAttemptId` both existed;
- the codebase did not define which layer owned retry budget;
- `ADR-0016` made adapters the owner of `logicalAttemptId`;
- the current runtime had no business recovery primitive, but `RETRY_RUN`
  already existed in the signal vocabulary.

That combination created an unstable contract. Adapter-native retries,
engine/application recovery, and future RBAC around retry/recovery operations
could not share one source of truth.

## Decision

### 1. Attempt ownership is split by semantics

- `engineAttemptId` is provider/runtime-owned.
  - It tracks technical retries, worker restarts, and provider recovery.
  - It is diagnostic only.
  - It MUST NOT consume business retry budget.
- `logicalAttemptId` is engine/application-owned.
  - It tracks business retry lineage.
  - It is authoritative for retry budget, idempotency, and recovery lineage.
  - Adapters MUST treat it as an input, not as a local counter.

### 2. Public start input and adapter input are no longer the same object

- Public callers provide `RunContext` without `logicalAttemptId`.
- The engine/application layer resolves a `ResolvedRunContext` before calling an
  adapter.
- `ResolvedRunContext` carries:
  - `logicalAttemptId`
  - `parentRunId?`
  - `originRunId?`

### 3. `RETRY_RUN` is business recovery, not a provider-native retry signal

- `RETRY_RUN` creates a new `runId` derived from a terminal source run.
- The source run remains immutable.
- Recovery lineage is tracked through:
  - `parentRunId`: immediate source run
  - `originRunId`: first run in the chain
  - `logicalAttemptId`: monotonic business attempt number in the chain
- Adapters MUST NOT implement `RETRY_RUN` by mutating the original provider run.

### 4. Retry lineage reservation is a state-store responsibility

The state store owns an atomic reservation operation:

`reserveRetryAttempt(tenantId, sourceRunId) -> { parentRunId, originRunId, logicalAttemptId }`

Rules:

- reservation MUST be monotonic per `originRunId`;
- concurrent reservations from the same chain MUST produce unique attempt ids;
- the reservation result is the only valid source for a new recovery run's
  `logicalAttemptId`.

### 5. Provider-native retries stay technical

- Temporal/native activity retries MAY change `engineAttemptId`.
- They MUST NOT advance `logicalAttemptId`.
- They MUST NOT emit extra logical lifecycle events (`RunStarted`,
  `StepStarted`, etc.) for the same logical attempt.

### 6. Scope boundary

- `RETRY_STEP` remains unsupported in this slice.
- Partial replay and step-scoped recovery semantics require a separate ADR.
- Cost attribution remains separate work.

## Consequences

- `ADR-0016` is superseded.
- `RunContext.logicalAttemptId` is removed from the public boundary.
- Adapters now depend on engine/application resolution for business attempt
  authority.
- `RunMetadata` persists recovery lineage, making future recovery and
  operation-level RBAC auditable and enforceable.
- `S08` is unblocked because plan/runtime ownership can now build on a stable
  retry authority model.
