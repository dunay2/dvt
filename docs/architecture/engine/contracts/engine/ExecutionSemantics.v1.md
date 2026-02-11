# Execution Semantics Contract (Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: Core semantics — breaking changes require version bump  
**Consumers**: Engine, StateStore, Projector  
**References**: [IWorkflowEngine Contract](./IWorkflowEngine.v1.md), [PostgreSQL](https://postgresql.org), [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)

---

## 1) Source of Truth: StateStore Model

`IRunStateStore` is the **authoritative, persistent source of truth** for all execution state.

### 1.1 Monotonic Sequence Invariant

Every event persisted to StateStore MUST include a monotonically increasing `runSeq` (per `runId`).

```sql
CREATE TABLE run_events (
  runId VARCHAR(255),
  runSeq BIGINT,                    -- AUTO-GENERATED per runId (monotonic)
  eventId UUID PRIMARY KEY,
  stepId VARCHAR(255),
  engineAttemptId VARCHAR(255),     -- Temporal/Conductor platform assigned
  logicalAttemptId VARCHAR(255),    -- Business-level, engine assigned
  eventType VARCHAR(64),
  eventData JSONB,
  idempotencyKey CHAR(64),          -- SHA256 hex
  emittedAt TIMESTAMP,
  persistedAt TIMESTAMP DEFAULT NOW(),
  adapterVersion VARCHAR(40),
  engineRunRef JSONB,
  causedBySignalId UUID,
  parentEventId UUID,
  
  PRIMARY KEY (runId, runSeq),
  UNIQUE (runId, idempotencyKey),
  INDEX (runId),
  INDEX (eventType, persistedAt)
) PARTITION BY RANGE (persistedAt);
```

**UI consumption rule**:
- UI polls events ordered by `runSeq`.
- If gap detected (expected `runSeq=10`, received `runSeq=12`):
  1. Mark run as `STALE`.
  2. Refetch snapshot or force resync.
  3. Resume when gap closes.

---

### 1.2 Append-Only Event Model

State is derived by reducing **append-only events** in order. No field is ever updated in-place.

**Canonical event types**:

| Event | Emitted By | Effect |
|-------|------------|--------|
| `RunApproved` | Planner | `status := APPROVED` |
| `RunStarted` | Engine | `status := RUNNING`, `engineRunRef` recorded |
| `StepStarted` | Activity | Step `status := RUNNING` |
| `StepCompleted` | Activity | Step `status := SUCCESS`, artifacts recorded |
| `StepFailed` | Activity | Step `status := FAILED`, error recorded |
| `StepSkipped` | Engine | Step `status := SKIPPED`, reason recorded |
| `SignalAccepted` | IAuthorization | Decision recorded, does NOT change run status |
| `SignalRejected` | IAuthorization | Signal denied |
| `RunPaused` | Engine | `status := PAUSED` |
| `RunResumed` | Engine | `status := RUNNING` |
| `RunCompleted` | Engine | `status := COMPLETED` |
| `RunFailed` | Engine | `status := FAILED` |
| `RunCancelled` | Engine | `status := CANCELLED` |

---

### 1.3 Dual Attempt Strategy (CRITICAL INVARIANT)

`attemptId` is decomposed into two distinct, required fields:

**`engineAttemptId` (infrastructure-level)**:
- Assigned by platform (Temporal SDK, Conductor runtime).
- Increments on ANY platform-level retry (network glitch, timeout, etc.).
- NOT used by Planner for dependencies, cost, or skip decisions.
- Visible to SRE for debugging.
- Example: `engineAttemptId=3` = Temporal retried activity 2 times before succeeding.

**`logicalAttemptId` (business-level)**:
- Assigned by Engine (monotonic per `stepId` per `runId`).
- Increments ONLY when:
  - Operator issues `RETRY_STEP` signal, OR
  - Planner policy dictates retry (e.g., backoff exhausted).
- Used by Planner for dependency resolution: **unique key is `(runId, stepId, logicalAttemptId)`**.
- Visible to UI as "Retry #1", "Retry #2", etc.
- Example: `logicalAttemptId=2` = operator/planner issued 1 retry signal.

**Idempotency key (NORMATIVE)**:
```
SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)
```

NOT `engineAttemptId`. Same logical attempt retried by platform → same idempotency key.

---

### 1.4 Snapshot Projections (Derived State)

Two immutable views derived from append-only log:

```ts
interface RunSnapshot {
  runId: string;
  status: "PENDING" | "APPROVED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  lastEventSeq: number;        // High-water mark for UI sync
  steps: StepSnapshot[];
  artifacts: ArtifactRef[];
  startedAt?: string;
  completedAt?: string;
  totalDurationMs?: number;
}

interface StepSnapshot {
  stepId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
  logicalAttemptId: string;
  engineAttemptId?: string;
  startedAt?: string;
  completedAt?: string;
  artifacts: ArtifactRef[];
  error?: { code: string; message: string; retryable: boolean };
}
```

**Invariants**:
- Snapshots are **always immutable** (new object per projection, never in-place update).
- Projection lag SLA: ≤1s in normal operation.
- If lag > 5s, emit alert `PROJECTOR_LAG_HIGH` (P2).

---

### 1.5 Snapshot Projection Rules (Normative)

**Projector contract**:

```ts
interface SnapshotProjector {
  projectRun(runId: string, events: CanonicalEngineEvent[]): Promise<RunSnapshot>;
  incrementalProject(snapshot: RunSnapshot, newEvents: CanonicalEngineEvent[]): Promise<RunSnapshot>;
  detectGaps(lastSeq: number, nextSeq: number): Promise<{ hasGap: boolean }>;
}
```

**Normative rules**:

1. **Monotonic ordering**: Consume events in strictly increasing `runSeq` order. If gap detected, **HALT** until gap closes. Never skip.

2. **Immutability**: Each projection is a new snapshot. No in-place updates. `lastEventSeq` = highest `runSeq` applied.

3. **Event reduction** (idempotent state machine):
   - `RunApproved` → status = APPROVED
   - `RunStarted` → status = RUNNING, engineRunRef set
   - `StepStarted` → create/update step, status = RUNNING
   - `StepCompleted` → status = SUCCESS, record artifacts
   - `StepFailed` → status = FAILED, record error, update failedSteps counter
   - `RunPaused` → status = PAUSED
   - `RunResumed` → status = RUNNING
   - `RunCompleted` → status = COMPLETED, aggregate artifacts
   - `RunFailed` → status = FAILED, record root cause
   - `RunCancelled` → status = CANCELLED

4. **Failure recovery**: Projector crashes → resume from `lastUpdateSeq` watermark. Reprocessing same event idempotently is safe.

5. **UI lag SLA**:
   - ≤1s: normal
   - >5s: alert P2 `PROJECTOR_LAG_HIGH`
   - Gap detected: alert P1 `PROJECTOR_GAP_DETECTED`

---

## 2) Secrets & Artifacts (Transient Data)

Plan MUST contain **only references** to secrets, never values.

**Secret resolution** (Activity-side):
```ts
interface ISecretsProvider {
  resolve(refs: SecretRef[], ctx: { tenantId: string; environmentId: string }): Promise<Record<string, string>>;
}
```

**Artifact storage** (never in history):
```ts
type ArtifactRef = {
  uri: string;                 // s3://..., gs://..., azure://...
  kind: string;                // "dbt-manifest", "dbt-run-results", "log-bundle", etc.
  sha256?: string;
  sizeBytes?: number;
  expiresAt?: string;          // retention policy per kind
};

interface StepOutput {
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  artifactRefs: ArtifactRef[];
  error?: { category: string; code?: string; message: string; retryable?: boolean };
}
```

**StateStore contract**: Store only `ArtifactRef[]` pointers, never binary payloads.

---

## 3) Backpressure & Run Queue (Execution-Time)

Engine response to overload:

- **REJECT**: fail fast (429 + retry-after).
- **QUEUE**: persist in `PENDING`, enqueue for later.
- **DELAY**: accept but schedule activities with future start time.

**Run queue reconciler contract** (stateless, idempotent):

```ts
interface IRunQueueReconciler {
  dequeueAndStart(): Promise<{ runId: string; status: "STARTED" | "FAILED" | "SKIPPED" }[]>;
}
```

**Idempotency**:
- Uniqueness constraint (database): `(tenantId, projectId, environmentId, planId, planVersion, runRequestId)`.
- Idempotency key: `SHA256(tenantId | projectId | environmentId | planId | planVersion | runRequestId)`.
- Double-start prevention: atomic lease acquire before `startRun()`.

---

## 4) Event Bus Integration (Eventually Consistent)

Secondary path for downstream consumers (Planner audits, UI updates, webhooks).

**Guarantees**:
- **Primary**: StateStore (synchronous, source of truth).
- **Secondary**: EventBus (asynchronous, eventually consistent, may be down).
- **Ordering**: per-runId guaranteed in StateStore; best-effort in EventBus.

**Failure handling**:
- EventBus publish fails → enqueue to **outbox** (StateStore) for retry worker.
- Retry policy: exponential backoff + jitter.
- After N failures → DLQ with alert.

---

## 5) StateStore Write Model & Latency Budget (Operational)

Activities emit events with bounded latency budget. If write budget exceeded:

- **Non-critical** (StepStarted): fail open to outbox (reconcile later).
- **Critical** (StepCompleted, StepFailed): fail step if budget exceeded.

**Latency budget config**:
```yaml
stateStore:
  writeLatencyBudgetMs: 3000
  failOpenForEventClass: ["StepStarted"]
  neverFailOpen: ["StepCompleted", "StepFailed"]
```

---

## 6) Continue-As-New Policy (Temporal)

Workflow MUST call `continueAsNew()` to rotate history when EITHER:

- `stepsSinceLastContinue >= CONTINUE_STEPS` (default: 50), OR
- `estimatedHistoryBytes >= HISTORY_BYTES_THRESHOLD` (default: 1MB).

**State persisted across continuation** (minimal):
- `PlanRef` (reference, not full plan)
- `cursor` (compacted: completed step ranges or bitmap)
- `ArtifactRef[]` (pointers only)
- Minimal counters

**Never persist**: step logs, expanded lists, large error blobs.

**Limits**: Enforce `maxSignalSizeBytes=64KB`, `maxSignalsPerRunPerMinute=60`.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial normative contract (StateStore, events, dual attempts, projection) |
