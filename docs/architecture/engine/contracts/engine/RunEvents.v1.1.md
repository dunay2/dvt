# Run Events Contract (Normative v1.1)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.1  
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: StateStore, Projectors, UI, Audit Systems  
**Parent Contract**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md)  
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

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
- `stepId`: Step identifier (if applicable, for step-level events)
- `engineAttemptId`: Physical attempt counter (infrastructure retries)
- `logicalAttemptId`: Logical attempt counter (policy/user retries)
- `runSeq`: Monotonically increasing sequence number per `runId`
- `idempotencyKey`: SHA256 hash for deduplication
- `tenantId`, `projectId`, `environmentId`: Correlation identifiers

### 2.2 Idempotency Guarantee

Events **MUST** be idempotent: same event replayed → same state.

**Idempotency key formula**:

```
SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)
```

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

This table defines the **ONLY valid** state transitions from events.

| Event          | Status Transition | Notes                                      |
| -------------- | ----------------- | ------------------------------------------ |
| `RunStarted`   | → `RUNNING`       | Workflow execution begins                  |
| `RunPaused`    | → `PAUSED`        | After PAUSE signal acknowledgment          |
| `RunResumed`   | → `RUNNING`       | After RESUME signal acknowledgment         |
| `RunCompleted` | → `COMPLETED`     | All steps succeeded                        |
| `RunFailed`    | → `FAILED`        | Terminal failure (step exhausted retries)  |
| `RunCancelled` | → `CANCELLED`     | After cancelRun() or EMERGENCY_STOP signal |

**Status enum** (see [ExecutionSemantics.v1.md § 1.2](./ExecutionSemantics.v1.md#12-append-only-event-model)):

- `PENDING`: Run created, awaiting approval
- `APPROVED`: Approved by planner, ready to start
- `RUNNING`: Currently executing steps
- `PAUSED`: Paused by operator signal
- `COMPLETED`: Successfully finished all steps
- `FAILED`: Terminated due to step failure
- `CANCELLED`: Terminated by operator cancellation

---

## 4) Event Schema (Base Structure)

```ts
interface RunEventBase {
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
  occurredAt: string; // ISO 8601 UTC
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  runSeq: number; // Assigned by StateStore (monotonic, gaps allowed)
  idempotencyKey: string; // SHA256 hash
  stepId?: string; // Present for step-level events
  payload?: Record<string, unknown>; // Event-specific data
}
```

### 4.1 Event Payload

`payload` field is **event-specific** and MAY contain:

- Step execution results (for `StepCompleted`)
- Error details (for `StepFailed`, `RunFailed`)
- Signal acknowledgment details (for `RunPaused`, `RunResumed`)

**Type safety**: `Record<string, unknown>` requires runtime validation by consumers.

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

| Version | Date       | Change                                                                                |
| ------- | ---------- | ------------------------------------------------------------------------------------- |
| 1.1     | 2026-02-12 | Extracted from IWorkflowEngine.v1.md to reduce churn. Added state transition mapping. |
