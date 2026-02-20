# ADR-0016 — logicalAttemptId Ownership by Adapter

Status: Proposed  
Date: 2026-02-20

## Context

`logicalAttemptId` is a DVT domain concept (distinct from provider/engine retry counters). It is required for idempotency semantics and must be durable across retries and restarts.

Temporal workflow determinism forbids arbitrary DB reads in workflow code, so attempt tracking cannot depend on querying the state store at emission time.

## Decision

- Adapters MUST maintain `logicalAttemptId` internally and emit it in every event envelope.
- The engine MUST NOT perform DB reads to determine `logicalAttemptId`.
- Temporal adapter:
  - tracks `logicalAttemptId` in workflow state
  - passes it into activities as input parameters
- Other adapters may use their own internal mechanisms.

Projector-derived attempt counts are allowed for projection/analysis but MUST NOT be used as an emission-time source of truth.

## Consequences

- Deterministic Temporal workflows remain compliant.
- Retry signals must be wired into orchestrator runtime (e.g., Temporal signals) to increment logicalAttemptId.
- **Scope note:** `RETRY_STEP` / `RETRY_RUN` signal handling and the end-to-end signal→increment wiring are Phase 2 scope.
