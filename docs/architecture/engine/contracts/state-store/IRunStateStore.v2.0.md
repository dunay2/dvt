# IRunStateStore Contract (Normative v2.0.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 2.0.0  
**Stability**: Contracts — breaking changes require major version bump  
**Consumers**: Engine, adapters, projector pipelines  
**Related Contracts**: [RunEvents.v2.0.md](../engine/RunEvents.v2.0.md), [ExecutionSemantics.v2.0.md](../engine/ExecutionSemantics.v2.0.md)

---

## 1) Scope

This contract defines persistence responsibilities of the Append Authority (StateStore):

- append-only event persistence,
- `runSeq` assignment,
- idempotency enforcement,
- persisted-record read API.

---

## 2) Canonical Types

```ts
interface IRunStateStore {
  appendEvent(event: RunEventWrite): Promise<AppendResult>;
  fetchEvents(
    runId: string,
    options?: { afterSeq?: number; limit?: number }
  ): Promise<RunEventRecord[]>;
  getSnapshot(runId: string): Promise<RunSnapshot | null>;
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}

interface AppendResult {
  eventId: string; // existing or newly inserted
  runSeq: number;
  persistedAt: string; // Append Authority time (RFC 3339 UTC)
  idempotent: boolean; // true if duplicate key hit
  persisted: boolean; // true if new row inserted
}

interface RunEventWrite {
  eventId: string; // UUID v4
  eventType: string;
  emittedAt: string; // producer clock (RFC 3339 UTC)
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string; // SHA256(runId|stepIdNormalized|logicalAttemptId|eventType|planId|planVersion)
  stepId?: string;
  payload?: Record<string, unknown>;
}

interface RunEventRecord extends RunEventWrite {
  runSeq: number;
  persistedAt: string;
}
```

---

## 3) Normative Rules

### 3.1 Write vs Record split

- `appendEvent` MUST accept `RunEventWrite` (no `runSeq`, no `persistedAt`).
- Store MUST return assignment metadata in `AppendResult`.
- Read APIs MUST return `RunEventRecord` (with `runSeq` + `persistedAt`).

### 3.2 Idempotency collision behavior

If `(runId, idempotencyKey)` already exists, Append Authority MUST:

1. Return existing `eventId`, `runSeq`, `persistedAt`,
2. Set `idempotent = true`, `persisted = false`,
3. MUST NOT insert duplicate rows.

### 3.3 Attempt semantics

- `logicalAttemptId` and `engineAttemptId` MUST be number and REQUIRED.
- `logicalAttemptId` MUST start at `1`.
- If runtime cannot provide attempt, producers MUST set `engineAttemptId = 1`.

### 3.4 Time semantics

- `emittedAt` MUST be preserved as producer-supplied timestamp.
- `persistedAt` MUST be stamped by Append Authority at commit time.

---

## 4) Minimum Storage Constraints

Implementations MUST enforce:

- unique key on `(runId, runSeq)`,
- unique key on `(runId, idempotencyKey)`,
- append-only immutability for persisted event rows.

---

## 5) Change Log

- **2.0.0 (2026-02-16)**: **MAJOR** — canonicalized write vs record split; made `eventId` REQUIRED; made attempts required numeric fields; standardized duplicate handling to return existing metadata; formalized `persistedAt` as append-authority timestamp.
