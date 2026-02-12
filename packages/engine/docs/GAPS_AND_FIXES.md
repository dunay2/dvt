# GAPS_AND_FIXES.md

**Date**: 2026-02-12  
**Scope**: Phase 1 engine-core implementation aligned to `IWorkflowEngine Contract (Normative v1.1.1)`

## Implemented fixes (Phase 1)

- **FIX-01 Event ordering at run start**
  - Engine emits `RunQueued` and `RunStarted` before calling `adapter.startRun(...)`.
  - File: `src/core/WorkflowEngine.ts`

- **FIX-02 Outbox atomicity (in-memory)**
  - `InMemoryTxStore` exposes `appendEventsAndOutboxTx(...)` so event append and outbox enqueue happen in one in-memory transaction.
  - Engine uses that capability when available.
  - Files: `src/state/InMemoryTxStore.ts`, `src/core/WorkflowEngine.ts`

- **FIX-03 Idempotency semantics**
  - Idempotency keys are derived from `logicalAttemptId` (not engine attempt).
  - The store deduplicates by `idempotencyKey` and returns existing `runSeq` instead of failing.
  - Files: `src/core/idempotency.ts`, `src/state/InMemoryTxStore.ts`

- **FIX-04 Deterministic snapshot hashing**
  - Snapshot hash is `SHA-256(JCS(snapshot))` where JCS is JSON Canonicalization Scheme.
  - Rejects non-finite numbers.
  - Files: `src/utils/jcs.ts`, `src/utils/sha256.ts`, `src/core/SnapshotProjector.ts`

- **FIX-05 PlanRef allowlist policy**
  - Rejects unsafe URI schemes and supports host allowlisting for `https`.
  - File: `src/security/planRefPolicy.ts`

## Deferred to Phase 2

- **Temporal integration**: wire `TemporalAdapter` to Temporal TS SDK client/workers and enforce plan fetch + integrity verification inside the provider workflow/activities.
- **Conductor integration**: wire `ConductorAdapter` to a Conductor client and implement the provider-side state transitions.
- **Retries**: implement `RETRY_STEP` and `RETRY_RUN` with correct `logicalAttemptId` behavior.
- **Durable StateStore**: implement a database-backed `IRunStateStore` with a real database transaction for outbox.

## References

- RFC 8785 (JSON Canonicalization Scheme): https://www.rfc-editor.org/rfc/rfc8785
- Temporal TypeScript SDK docs: https://docs.temporal.io/develop/typescript
- Netflix Conductor docs/wiki: https://github.com/Netflix/conductor/wiki
