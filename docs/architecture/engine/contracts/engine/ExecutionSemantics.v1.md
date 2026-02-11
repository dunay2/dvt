# Execution Semantics Contract (Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0.1  
**Stability**: Core semantics — breaking changes require version bump  
**Consumers**: Engine, StateStore, Projector  

**References**:
 [IWorkflowEngine Contract](./IWorkflowEngine.v1.md)
 [Contract Versioning Policy](../../VERSIONING.md) — how this contract evolves (minor/major bumps, deprecation)
 [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)
 NOTE (Diagrams): Mermaid diagrams are illustrative unless explicitly marked as NORMATIVE.
 In case of conflict, the normative text rules win.
---

## 1) Source of Truth: StateStore Model

`IRunStateStore` is the **authoritative, persistent source of truth** for all execution state.

### 1.0 runSeq Design Decision

**Invariant**: `runSeq` is **monotonic per runId and event-ordered**, but NOT required to be contiguous. Gaps are allowed and natural.

**Why**:
- Distributed writers (activities, engine, planner) may batch events asynchronously
- Event bus + outbox pattern naturally creates gaps (not all seq#s are realized on every call)
- Contiguity requirement would force global sequencer (replica bottleneck; antipattern for distributed systems)
- Eventual consistency is explicit by design

**Implication**:
- UI observes non-contiguous fetches (e.g., `runSeq=10`, then `runSeq=12`) as normal behavior, not corruption
- Projector resumes from watermark (`lastEventSeq`); gaps are bridged by ongoing event emission
- Alert `PROJECTOR_NON_CONTIGUOUS_FETCH_DETECTED` indicates slow projection or lag, not data loss
- Operational monitoring focuses on watermark advancement, not gap closure

---

### 1.1 Monotonic Sequence Invariant

Every event persisted to StateStore MUST include a **strictly increasing** `runSeq` (per `runId`).
`runSeq` MUST be monotonic, but it is **NOT required to be contiguous** (i.e., gaps are allowed).


 IMPORTANT: `runSeq` MUST be assigned by the **StateStore write path** (or a dedicated sequencer)
 in a way that guarantees monotonicity per `runId`. Do NOT rely on "AUTO-INCREMENT per runId"
 unless your chosen storage supports it correctly.

```sql
-- Snowflake-oriented physical schema (logical constraints are documented; Snowflake does not enforce PK/UNIQUE).
CREATE TABLE IF NOT EXISTS RUN_EVENTS (
  RUN_ID             STRING,
  RUN_SEQ            NUMBER(38,0),         -- assigned by writer/sequencer (monotonic per RUN_ID)
  EVENT_ID           STRING,               -- UUID as string
  STEP_ID            STRING,
  ENGINE_ATTEMPT_ID  STRING,               -- platform-level retry counter/id
  LOGICAL_ATTEMPT_ID STRING,               -- business-level retry counter/id
  EVENT_TYPE         STRING,
  EVENT_DATA         VARIANT,
  IDEMPOTENCY_KEY    STRING,               -- SHA256 hex
  EMITTED_AT         TIMESTAMP_NTZ,
  PERSISTED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  ADAPTER_VERSION    STRING,
  ENGINE_RUN_REF     VARIANT,
  CAUSED_BY_SIGNAL_ID STRING,              -- UUID as string
  PARENT_EVENT_ID    STRING                -- UUID as string
);

-- Recommended (performance): cluster by run + time for polling/projection.
ALTER TABLE RUN_EVENTS CLUSTER BY (RUN_ID, PERSISTED_AT);
```

**Logical constraints (NORMATIVE, storage-agnostic):**
- Unique key: `(runId, runSeq)`
- Uniqueness: `(runId, idempotencyKey)`


**UI consumption rule**:
- UI polls events ordered by `runSeq`.
If a non-contiguous fetch is observed (e.g., last seen `runSeq=10`, next fetched `runSeq=12`), it MUST be treated as **eventual consistency** (not corruption):
  1. Mark run as `STALE`.
  2. Trigger resync (refetch snapshot and/or refetch events from `lastEventSeq` watermark).
  3. Resume once resync completes successfully AND `lastEventSeq` watermark advances beyond the previously observed non-contiguous range.


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
  detectNonContiguous(lastSeq: number, nextSeq: number): Promise<{ observedNonContiguous: boolean }>;
}
```

**Normative rules**:

1. **Monotonic ordering**: Consume events in strictly increasing `runSeq` order.
   - If a non-contiguous observation is detected, the projector MUST NOT assume data loss.
   - The projector MUST pause incremental projection, request a resync (snapshot + delta), and resume once resync completes successfully AND the watermark (`lastEventSeq`) advances.
   - The projector MUST NOT "invent" missing sequences and MUST NOT reorder beyond `runSeq`.
 
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

4. **Failure recovery**: Projector crashes → resume from `lastEventSeq` watermark. Reprocessing same event idempotently is safe.

5. **UI lag SLA**:
   - ≤1s: normal
   - >5s: alert P2 `PROJECTOR_LAG_HIGH`
   - non-contiguous fetch observed: alert P2 `PROJECTOR_NON_CONTIGUOUS_FETCH_DETECTED` (investigate consistency; resync may be needed)

6. **Unknown event types** (forward compatibility): Unknown `eventType` values MUST NOT fail projection. The projector MUST advance `lastEventSeq` for unknown events (to maintain watermark progress) but MUST NOT apply state transitions. Unknown events MAY be logged for audit purposes.

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

## Schema Evolution (Versioning)

Changes to this contract follow **Semantic Versioning** (see [VERSIONING.md](../../VERSIONING.md)):

**MINOR Bump (v1.0 → v1.1)**: Backward-compatible additions
- New optional event types (consumers ignore unknown types)
- New optional fields in existing events (producers and consumers tolerate old/new shapes)
- Constraint relaxation (e.g., widened `maxLength` on a field)
- Documentation clarifications

**MAJOR Bump (v1.0 → v2.0)**: Breaking changes
- Remove required field or change field type
- Rename event type or field
- Narrow enum values or add validation constraints
- Change idempotency key structure
- Change status transition semantics

**Patch Update (v1.0.1, v1.0.2, etc.)**: Clarifications only
- No normative semantic changes
- Documentation fixes
- Tracked via git tags (e.g., `engine/ExecutionSemantics@v1.0.1`), not separate files

**Consumer compatibility note**: 
Producers MUST emit events compatible with the contract version. Consumers MUST accept both old and new event shapes during grace periods (see VERSIONING.md for deprecation timelines).

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0.1 | 2026-02-11 | **Patch**: Clarified non-contiguous semantics (resync exit condition uses watermark advancement, not gap closure); added normative rule for unknown eventType handling (forward compatibility) |
| 1.0 | 2026-02-11 | Initial normative contract (StateStore, events, dual attempts, projection) |
