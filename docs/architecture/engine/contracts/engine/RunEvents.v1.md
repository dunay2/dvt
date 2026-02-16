# Run Events Contract (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT
**Version**: v1
**Stability**: Contracts — breaking changes require version bump
**Consumers**: StateStore, Projectors, UI, Audit Systems
**Parent Contract**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [Temporal Limits](https://docs.temporal.io/encyclopedia/limits), [Temporal SDK](https://docs.temporal.io/develop/typescript), [Conductor](https://github.com/netflix/conductor/wiki)

**Version alignment**: Contract v1 aligns with parent IWorkflowEngine.v1 and ExecutionSemantics.v1.

---

## 1) Event Emission Contract

Events are written to `IRunStateStore` (synchronous primary path, source of truth).

### 1.1 Lifecycle Events (MUST be emitted)

- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `StepSkipped`
- `RunPaused`
- `RunResumed`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

**Scope (NORMATIVE)**: This contract governs events emitted by the **Engine** during workflow execution. Signal decision events (`SignalAccepted`, `SignalRejected`) are emitted by the **Authorization** component and are defined in `SignalsAndAuth.v1.md`. They are out of scope here.

**Note**: `RunQueued` may be emitted by the Admission Control / Run Queue component (see ExecutionSemantics §3). If admission control is implemented inside an engine adapter, that adapter MUST emit `RunQueued` using the shared schema; otherwise it is out of scope for this contract.

### 1.2 Event Naming Convention

**MUST** use PascalCase event names **without** `on` prefix.

- ✅ Correct: `RunStarted`, `StepStarted`, `RunCompleted`
- ❌ Incorrect: `onRunStarted`, `onStepStarted`, `onRunCompleted`

**Rationale**: Consistent naming across:

- Idempotency key generation (`SHA256(... | eventType | ...)`)
- Projector event routing
- UI event stream visualization
- Audit log correlation

---

## 2) Event Contract Requirements

### 2.1 Required Event Fields

Events **MUST** include these fields:

- `runId`: Workflow run identifier (UUID v4)
- `stepId`: Step identifier (REQUIRED for step-level events; omitted for run-level events)
- `planId`: Execution plan identifier (REQUIRED; used in idempotency key)
- `planVersion`: Execution plan version (REQUIRED; used in idempotency key)

**Rationale**: `planId` and `planVersion` are included in every event (not only `RunStarted`) to enable self-contained idempotency verification and projector logic without cross-event joins.

- `engineAttemptId`: Physical attempt counter (infrastructure retries)
- `logicalAttemptId`: Logical attempt counter (policy/user retries)
- `runSeq`: Monotonically increasing sequence number per `runId` (assigned by StateStore)
- `idempotencyKey`: SHA256 hash for deduplication
- `tenantId`, `projectId`, `environmentId`: Correlation identifiers

### 2.2 Idempotency Guarantee

Events **MUST** be idempotent: same event replayed → same state.

**Idempotency key formula**:

```
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planVersion)
```

**stepIdNormalized** (normalization rule):

- For step-level events: use actual `stepId`
- For run-level events (RunStarted, RunCompleted, RunFailed, RunCancelled, RunPaused, RunResumed): use literal `'RUN'`

**Rationale**: Run-level events don't have a stepId, but the formula must be deterministic. The literal `'RUN'` ensures consistent hashing across all implementations.

**Idempotency collision handling (NORMATIVE)**:

If an event with the same `(runId, idempotencyKey)` already exists, the Append Authority MUST either:

1. Reject with `IDEMPOTENCY_KEY_EXISTS`, OR
2. Succeed and return the existing event metadata (including `runSeq`) without inserting a duplicate.

The chosen behavior MUST be documented in the adapter contract.

### 2.3 Sequence Number Assignment (runSeq)

**Assignment mechanism (NORMATIVE)**:

- Engine writes events **without** `runSeq`.
- The **Append Authority** assigns `runSeq` during the append operation (see State Store Contract §3).
- Engine receives assigned `runSeq` in the append response (or reads back).

**Properties**:

- `runSeq` MUST be strictly increasing per `runId`.
- Gaps are allowed.

---

## 3) State Transition Mapping (Normative)

This table defines the **ONLY valid** state transitions from **engine-emitted events**.

### Run-level transitions (NORMATIVE)

| Event          | Status Transition | Notes                                                              |
| -------------- | ----------------- | ------------------------------------------------------------------ |
| `RunStarted`   | → `RUNNING`       | Workflow execution begins                                          |
| `RunPaused`    | → `PAUSED`        | After PAUSE signal accepted + applied (not when request received)  |
| `RunResumed`   | → `RUNNING`       | After RESUME signal accepted + applied (not when request received) |
| `RunCompleted` | → `COMPLETED`     | All steps succeeded                                                |
| `RunFailed`    | → `FAILED`        | Terminal failure (step exhausted retries)                          |
| `RunCancelled` | → `CANCELLED`     | After cancelRun() or EMERGENCY_STOP signal                         |

### Step-level transitions (NORMATIVE)

| Event           | Step Status Transition | Notes                              |
| --------------- | ---------------------- | ---------------------------------- |
| `StepStarted`   | → `RUNNING`            | Attempt enters RUNNING             |
| `StepCompleted` | → `SUCCESS`            | Terminal for that attempt          |
| `StepFailed`    | → `FAILED`             | Terminal for that attempt          |
| `StepSkipped`   | `PENDING` → `SKIPPED`  | Dependency/condition/operator skip |

**Status enum** (see [ExecutionSemantics.v1.md § 1.2](./ExecutionSemantics.v1.md#12-append-only-event-model)):

- `PENDING`: Run created, awaiting approval (**managed by Planner/StateStore, not engine events**)
- `APPROVED`: Approved by planner, ready to start (**managed by Planner/StateStore, not engine events**)
- `RUNNING`: Currently executing steps
- `PAUSED`: Paused by operator signal
- `COMPLETED`: Successfully finished all steps
- `FAILED`: Terminated due to step failure
- `CANCELLED`: Terminated by operator cancellation

**Scope note**: This contract governs **engine-emitted transitions only**. `PENDING` and `APPROVED` states are set by Planner via StateStore contract (out of scope for this document).

---

## 4) Event Schema (Two-Phase Model)

**Timestamp naming (NORMATIVE)**: All event envelopes MUST use `emittedAt` as the engine-side event timestamp. `persistedAt` is assigned by the StateStore/Append Authority. The suite MUST NOT mix `occurredAt` and `emittedAt` in v1.1.

**Timestamp authority (NORMATIVE)**: For time-based querying and ordering (e.g., "events in the last 5 minutes"), consumers MUST use `persistedAt` (Append Authority / StateStore server time). `emittedAt` MAY suffer clock skew and MUST NOT be used for critical time-based decisions.

### 4.1 RunEventWrite (Input to StateStore)

Engine writes events **without** `runSeq` (StateStore assigns during write).

```ts
interface RunEventWrite {
  eventType:
    | 'RunStarted'
    | 'StepStarted'
    | 'StepCompleted'
    | 'StepFailed'
    | 'StepSkipped'
    | 'RunPaused'
    | 'RunResumed'
    | 'RunCompleted'
    | 'RunFailed'
    | 'RunCancelled';
  emittedAt: string; // ISO 8601 UTC (engine clock)
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string; // REQUIRED (for idempotency key)
  planVersion: string; // REQUIRED (for idempotency key)
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string; // SHA256 hash
  stepId?: string; // Present for step-level events only
  payload?: Record<string, unknown>; // Event-specific data
}
```

### 4.2 RunEventRecord (Persisted/Output from StateStore)

After StateStore persists, consumers (Projectors, UI, Audit) receive events **with** `runSeq` and `persistedAt`.

```ts
interface RunEventRecord {
  eventType:
    | 'RunStarted'
    | 'StepStarted'
    | 'StepCompleted'
    | 'StepFailed'
    | 'StepSkipped'
    | 'RunPaused'
    | 'RunResumed'
    | 'RunCompleted'
    | 'RunFailed'
    | 'RunCancelled';
  emittedAt: string; // ISO 8601 UTC (engine clock)
  persistedAt: string; // ISO 8601 UTC (StateStore server time, assigned during write)
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  runSeq: number; // Assigned by StateStore (monotonic, gaps allowed)
  idempotencyKey: string; // SHA256 hash
  stepId?: string; // Present for step-level events only
  payload?: Record<string, unknown>; // Event-specific data
}
```

**Usage**:

- Engine → StateStore: uses `RunEventWrite`
- StateStore → Projectors/UI/Audit: uses `RunEventRecord`

**persistedAt rationale**: Engine's `emittedAt` can suffer clock skew. `persistedAt` (server time) provides authoritative ordering for audit and debugging.

### 4.3 Event Payload (Recommended Fields)

**Payload presence (NORMATIVE)**:

If an event type carries event-specific data, the producer MUST include `payload`. When no additional data exists, `payload` MAY be omitted. Recommended fields below SHOULD be provided when available.

`payload` field is **event-specific** and MAY contain additional data. The following are **recommended fields** for specific event types:

#### StepFailed / RunFailed (Error Events)

```ts
payload: {
  errorCode?: string;        // Machine-readable error code (e.g., "TIMEOUT", "DB_CONNECTION_FAILED")
  errorMessage?: string;     // Human-readable error message
  retryable?: boolean;       // Whether this failure is retryable
  stack?: string;            // Stack trace (optional, for debugging)

  failureCategory?: 'USER' | 'SYSTEM' | 'PLATFORM' | 'TIMEOUT';  // Failure classification
  failureSource?: string;    // e.g., 'activity', 'engine', 'planner', 'secrets'
}
```

#### StepCompleted (Success Events)

```ts
payload: {
  result?: unknown;          // Step execution result (schema varies by step type)
  durationMs?: number;       // Execution duration in milliseconds
}
```

#### StepSkipped (Skip Events)

```ts
payload: {
  reason?: string;           // Human-readable reason for skip
  reasonCode?: string;       // e.g., "DEPENDENCY_FAILED", "CONDITION_FALSE", "OPERATOR_SKIP"
}
```

#### RunPaused / RunResumed (Signal Events)

```ts
payload: {
  signalId?: string;         // UUID of the signal that triggered pause/resume
  reason?: string;           // Human-readable reason (if provided in signal)
}
```

**Type safety**: `Record<string, unknown>` requires runtime validation by consumers. Implementations SHOULD define stricter payload schemas per event type.

---

## 5) Correlation Identifiers (Required in All Events)

All events MUST include these identifiers for traceability:

- **`tenantId`**: Tenant isolation boundary (MUST be validated)
- **`projectId`**: Project scope within tenant
- **`environmentId`**: Environment (dev/staging/prod) for config/secrets isolation
- **`runId`**: Unique identifier for this workflow run (UUID v4)
- **`engineAttemptId`**: Physical attempt counter (engine/worker restarts, infra retries)
  - Increments on: workflow restart, worker crash recovery, continue-as-new
  - Used for: debugging, infra failure detection, cost attribution
- **`logicalAttemptId`**: Logical attempt counter (step/run retries per planner policy)
  - Increments on: explicit RETRY_STEP signal, automatic retry per plan policy
  - Used for: deterministic replay, idempotency key generation, user-visible attempt count

**Semantic difference**:

- `engineAttemptId` = "how many times did the infrastructure restart this?"
- `logicalAttemptId` = "how many times did the user/policy retry this step?"

**Idempotency rule (alignment with IWorkflowEngine v1)**:

- Event `idempotencyKey` MUST be derived from `logicalAttemptId`, NOT `engineAttemptId`.
- `engineAttemptId` MUST be present in events/audit logs for debugging, but MUST NOT affect idempotency.
- Rationale: Infrastructure retries (network blips, worker restarts) → same logical attempt → same idempotency key.

---

## 6) References

- **Parent Contract**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)
- **Execution Semantics**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- **State Store Interface**: [IRunStateStore.v1.md](../../state/IRunStateStore.v1.md) (if exists)
- **Temporal Limits**: <https://docs.temporal.io/encyclopedia/limits>
- **Temporal SDK**: <https://docs.temporal.io/develop/typescript>
- **Conductor**: <https://github.com/netflix/conductor/wiki>

---

## Operational Recommendations (Non-normative)

- **Clock skew monitoring**: Large deltas between `emittedAt` and `persistedAt` may indicate network latency or clock drift and should trigger an ops alert.
- **Schema validation**: Producers should validate events against JSON Schemas before append to catch malformed payloads early.
- **Event retention**: Consider time-based or count-based retention policies per `runId` to manage storage costs while preserving audit trails.
- **Projector checkpointing**: Projectors should checkpoint on `runSeq` boundaries to enable resumable stream processing after failures.

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1   | 2026-02-12 | **PATCH**: Align with ExecutionSemantics v1.1.1 and IWorkflowEngine v1.1.1. **Critical fixes**: (A) Standardize `emittedAt` (not `occurredAt`) for event envelope timestamp. (B) Add `StepSkipped` to lifecycle events, unions, state transitions, and payload schema. (C) Clarify scope: Signal decision events (`SignalAccepted`, `SignalRejected`) out of scope. (D) Rename StateStore to **Append Authority** for `runSeq` assignment. (E) Add timestamp authority rule: use `persistedAt` for time-based queries. (F) Define idempotency collision handling (reject OR return existing). (G) Clarify `RunQueued` ownership. (H) Enhance error payload with `failureCategory` and `failureSource`. (I) Add rationale for `planId`/`planVersion` in all events. (J) Change payload optionalidad to NORMATIVE. Add Operational Recommendations section. |
| 1.1     | 2026-02-12 | Extracted from IWorkflowEngine.reference.v1.md to reduce churn. Added state transition mapping. **Critical fixes**: Split RunEventWrite/RunEventRecord (runSeq phases), normalize stepId in idempotency key (use 'RUN' for run-level events), add planId/planVersion as required fields, clarify PENDING/APPROVED managed by Planner, add persistedAt, define minimum payload schemas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
