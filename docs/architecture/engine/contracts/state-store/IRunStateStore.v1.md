# IRunStateStore Contract (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1  
**Stability**: Core semantics — breaking changes require version bump  
**Scope**: Append authority persistence boundary for run event logs and snapshots  
**Consumers**: Engine, adapters, projector pipelines  
**References**: [State Store Contract](./README.md), [ExecutionSemantics.v1.md](../engine/ExecutionSemantics.v1.md), [RunEvents.v1.md](../engine/RunEvents.v1.md)  
**Related Contracts**: [IRunStateStore.v2.0.md](./IRunStateStore.v2.0.md)  
**Supersedes**: None  
**Phase**: US-1.1 baseline  
**Parent Contract**: [State Store Contract](./README.md)

---

## 1) Purpose

This contract defines the **minimum normative baseline** for `IRunStateStore` in v1.

In scope:

- append-only persistence of canonical run/step events,
- monotonic `runSeq` assignment per `runId`,
- idempotent append semantics via `(runId, idempotencyKey)`,
- fetch and snapshot APIs used by projector and status consumers.

Out of scope:

- physical DDL/index/storage-engine tuning,
- adapter-internal transaction mechanisms,
- non-normative implementation optimizations.

---

## 2) Normative Rules (MUST / MUST NOT)

### MUST

- Accept event writes without preassigned `runSeq`; append authority assigns `runSeq` on persist.
- Enforce uniqueness of `(runId, runSeq)`.
- Enforce uniqueness of `(runId, idempotencyKey)`.
- Return events ordered by `runSeq` ascending in fetch APIs.
- Preserve producer timestamp as `emittedAt`.
- Stamp authoritative store timestamp as `persistedAt` when event is persisted.
- Guarantee append-only event history for persisted rows.

### MUST NOT

- Insert duplicate rows for the same `(runId, idempotencyKey)`.
- Mutate or delete individual persisted event rows as part of normal operation.
- Require contiguity of `runSeq` values (gaps are allowed).
- Use `engineAttemptId` to derive idempotency key semantics.

---

## 3) Contract Surface

```ts
interface IRunStateStore {
  appendEvent(event: RunEventWrite): Promise<AppendResult>;

  fetchEvents(
    runId: string,
    options?: {
      afterSeq?: number;
      limit?: number;
    }
  ): Promise<RunEventRecord[]>;

  getSnapshot(runId: string): Promise<RunSnapshot | null>;
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}

interface RunEventWrite {
  eventType: string;
  emittedAt: string; // RFC 3339 UTC
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  stepId?: string;
  payload?: Record<string, unknown>;
}

interface RunEventRecord extends RunEventWrite {
  runSeq: number;
  persistedAt: string; // RFC 3339 UTC (append authority time)
}

interface AppendResult {
  runSeq: number;
  idempotent: boolean;
  persisted: boolean;
  eventId?: string;
  persistedAt?: string;
}
```

---

## 4) Invariants

- **INV-STATE-1 (Monotonicity)**: `runSeq` is strictly increasing per `runId`.
- **INV-STATE-2 (Non-contiguity allowed)**: gaps in `runSeq` are valid under distributed writers.
- **INV-STATE-3 (Idempotency)**: repeated append with same `(runId, idempotencyKey)` MUST map to the same persisted logical event.
- **INV-STATE-4 (Append-only)**: event log is immutable after persist.
- **INV-STATE-5 (Ordering contract)**: `fetchEvents` returns by ascending `runSeq`.

---

## 5) Validation / Error Model

- On duplicate `(runId, idempotencyKey)`, implementation MUST return existing assignment semantics (`idempotent=true`, `persisted=false`) or equivalent deterministic metadata outcome.
- On uniqueness violation for `(runId, runSeq)`, implementation MUST reject write and surface adapter-specific storage error mapped by caller.
- `logicalAttemptId` and `engineAttemptId` MUST be numeric in stored records.
- For authoritative time-window analysis, consumers SHOULD use `persistedAt` instead of `emittedAt`.

---

## 6) Compatibility

- v1 is baseline for US-1.1 state-store boundary.
- Additive fields and optional metadata are MINOR-compatible within v1.
- Changes to key invariants (`runSeq`, idempotency uniqueness, append-only guarantees) require MAJOR versioning.
- v2 evolution reference: [IRunStateStore.v2.0.md](./IRunStateStore.v2.0.md).

---

## 7) Cross-References

- [State Store Contract](./README.md)
- [ExecutionSemantics.v1.md](../engine/ExecutionSemantics.v1.md)
- [RunEvents.v1.md](../engine/RunEvents.v1.md)
- [Contract Versioning Policy](../../VERSIONING.md)

---

## 8) Change Log

- **v1 (2026-02-17)**: Initial v1 baseline extracted and normalized for US-1.1 (#217).
