# Run Events Contract (Normative v1.1)

**Status**: Normative (MUST / MUST NOT)
**Version**: 1.1
**Stability**: Contracts — breaking changes require version bump
**Consumers**: StateStore, Projectors, UI, Audit Systems
**Parent Contract**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md)
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

**Version alignment**: Contract v1.1 aligns with parent IWorkflowEngine.v1.1.md and ExecutionSemantics.v1.md.

---

## 1) Event Emission Contract

Events are written to `IRunStateStore` (synchronous primary path, source of truth).

### 1.1 Lifecycle Events (MUST be emitted)

- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `RunPaused`
- `RunResumed`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

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

### 2.3 Sequence Number Assignment (runSeq)

**Assignment mechanism**:

- Engine writes events **without** `runSeq`
- StateStore assigns `runSeq` during write operation
- Engine receives assigned `runSeq` in write response (or reads back)

**Properties**:

- **MUST** be monotonically increasing per `runId`
- Gaps are **allowed** (e.g., failed writes, retries)
- Used for event ordering, replay, and projector checkpointing

---

## 3) State Transition Mapping (Normative)

This table defines the **ONLY valid** state transitions from **engine-emitted events**.

| Event          | Status Transition | Notes                                                              |
| -------------- | ----------------- | ------------------------------------------------------------------ |
| `RunStarted`   | → `RUNNING`       | Workflow execution begins                                          |
| `RunPaused`    | → `PAUSED`        | After PAUSE signal accepted + applied (not when request received)  |
| `RunResumed`   | → `RUNNING`       | After RESUME signal accepted + applied (not when request received) |
| `RunCompleted` | → `COMPLETED`     | All steps succeeded                                                |
| `RunFailed`    | → `FAILED`        | Terminal failure (step exhausted retries)                          |
| `RunCancelled` | → `CANCELLED`     | After cancelRun() or EMERGENCY_STOP signal                         |

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

### 4.1 RunEventWrite (Input to StateStore)

Engine writes events **without** `runSeq` (StateStore assigns during write).

```ts
interface RunEventWrite {
  eventType:
    | 'RunStarted'
    | 'StepStarted'
    | 'StepCompleted'
    | 'StepFailed'
    | 'RunPaused'
    | 'RunResumed'
    | 'RunCompleted'
    | 'RunFailed'
    | 'RunCancelled';
  occurredAt: string; // ISO 8601 UTC (engine clock)
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
    | 'RunPaused'
    | 'RunResumed'
    | 'RunCompleted'
    | 'RunFailed'
    | 'RunCancelled';
  occurredAt: string; // ISO 8601 UTC (engine clock)
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

**persistedAt rationale**: Engine's `occurredAt` can suffer clock skew. `persistedAt` (server time) provides authoritative ordering for audit and debugging.

### 4.3 Event Payload (Minimum Requirements)

`payload` field is **event-specific** and MAY contain additional data. The following are **minimum required fields** for specific event types:

#### StepFailed / RunFailed (Error Events)

```ts
payload: {
  errorCode?: string;        // Machine-readable error code (e.g., "TIMEOUT", "DB_CONNECTION_FAILED")
  errorMessage?: string;     // Human-readable error message
  retryable?: boolean;       // Whether this failure is retryable
  stack?: string;            // Stack trace (optional, for debugging)
}
```

#### StepCompleted (Success Events)

```ts
payload: {
  result?: unknown;          // Step execution result (schema varies by step type)
  durationMs?: number;       // Execution duration in milliseconds
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

Both MUST be included in event idempotency keys and audit logs.

---

## 6) References

- **Parent Contract**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md)
- **Execution Semantics**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- **State Store Interface**: [IRunStateStore.v1.md](../../state/IRunStateStore.v1.md) (if exists)

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1     | 2026-02-12 | Extracted from IWorkflowEngine.v1.1.md to reduce churn. Added state transition mapping. **Critical fixes**: Split RunEventWrite/RunEventRecord (runSeq phases), normalize stepId in idempotency key (use 'RUN' for run-level events), add planId/planVersion as required fields, clarify PENDING/APPROVED managed by Planner, add persistedAt, define minimum payload schemas. |
