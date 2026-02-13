# DVT Engine (Phase 1) — Engine Core Implementation

This repository contains a **Phase 1 / MVP** implementation of the **engine-core** for the DVT workflow engine:

- `IWorkflowEngine` (contract v1.1.1)
- `SnapshotProjector` (event-sourced state rebuild + deterministic snapshot hash)
- Adapter registry with a working `mock` adapter and stubs for `temporal` and `conductor`
- `IRunStateStore` and a deterministic in-memory transactional store `InMemoryTxStore`
- Transactional Outbox interfaces + worker

## What is included

- **Event-sourced state**: project snapshot from append-only event stream.
- **Deterministic hashing**: snapshot hash is SHA-256 over RFC8785-style canonical JSON.
- **Idempotency**: event idempotency keys are derived from `logicalAttemptId` (never `engineAttemptId`).
- **PlanRef security**: URI allowlist validation + SHA-256 integrity validation (implemented in `mock` adapter).

## How to use

### 1) Install dependencies

```bash
npm install
```

### 2) Build

```bash
npm run build
```

### 3) Run tests

```bash
npm test
```

## References

- Contract references (user-provided):
  - Temporal TS SDK: https://docs.temporal.io/develop/typescript
  - Temporal Workflows: https://docs.temporal.io/workflows
  - Netflix Conductor: https://github.com/netflix/conductor/wiki
- JSON Canonicalization Scheme (RFC 8785): https://www.rfc-editor.org/rfc/rfc8785

## Files

- `src/contracts/*` — v1.1.1 subset needed for this implementation
- `src/core/WorkflowEngine.ts` — main orchestrator + event emission
- `src/core/SnapshotProjector.ts` — event sourcing + deterministic hash
- `src/state/InMemoryTxStore.ts` — append-only state store + outbox in one atomic operation (in-memory)
- `src/adapters/mock/MockAdapter.ts` — fully working adapter used by tests
- `docs/GAPS_AND_FIXES.md` — gaps found vs contract + how they were solved

- RFC 8785 (JCS): https://www.rfc-editor.org/rfc/rfc8785
- Temporal TypeScript SDK: https://docs.temporal.io/develop/typescript
- Netflix Conductor: https://github.com/Netflix/conductor

## Deferred to Phase 2

- **Temporal integration**: wire `TemporalAdapter` to Temporal TS SDK client/workers and enforce plan fetch + integrity verification inside the provider workflow/activities.
- **Conductor integration**: wire `ConductorAdapter` to a Conductor client and implement the provider-side state transitions.
- **Retries**: implement `RETRY_STEP` and `RETRY_RUN` with correct `logicalAttemptId` behavior.
- **Durable StateStore**: implement a database-backed `IRunStateStore` with a real database transaction for outbox.
