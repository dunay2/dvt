# IWorkflowEngine Contract (Normative v1.1)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.1  
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Planner, State, UI  
**References**: [Temporal SDK](https://docs.temporal.io/develop/typescript), [Conductor API](https://conductor.netflix.com/)

---

## 1) Engine Boundary: MUST / MUST NOT

### MUST

- Accept a **versioned** `ExecutionPlan` and execute its steps reliably.
- Emit **run/step lifecycle events** (persisted into `IRunStateStore`).
- Support retries/backoff as specified by Planner policy (engine-agnostic rules).
- Support cancellation and "stop" semantics.
- Support **resuming / continuing** after transient failures (see [ExecutionSemantics.v1.md § 2](./ExecutionSemantics.v1.md) for resume semantics: PAUSE/RESUME signals, step replay rules, at-least-once vs exactly-once guarantees).
- Provide correlation identifiers: `tenantId`, `projectId`, `environmentId`, `runId`, `engineAttemptId`, `logicalAttemptId`.

### MUST NOT

- Perform planning (ordering/skip/cost decisions belong to `IExecutionPlanner`).
- Become the source of truth for state (`IRunStateStore` is the source of truth).
- Store secrets (`ISecretsProvider` handles that).

---

## 2) Minimal Contract: IWorkflowEngine

### 2.1 Operations

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}

interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'temporal' | 'conductor' | 'auto';
}
```

### 2.1.1 EngineRunRef (Structured, Adapter-Polymorphic)

```ts
type EngineRunRef =
  | {
      provider: 'temporal';
      namespace: string;
      workflowId: string;
      runId?: string;
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      workflowId: string;
      runId?: string;
      conductorUrl: string; // REQUIRED per invariant below
    };
```

**Invariants**:

- `namespace` (Temporal) MUST be present for Temporal provider.
- `conductorUrl` (Conductor) MUST be present for Conductor provider.
- `runId` SHOULD be present for cancellation/query operations.
- For debugging, include `taskQueue` (Temporal) to trace worker routing.

---

### 2.1.2 RunStatusSnapshot (Status Query Result)

```ts
interface RunStatusSnapshot {
  runId: string;
  status: RunStatus; // 'PENDING' | 'APPROVED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  substatus?: string; // e.g., "DRAINING" during pause, "RETRYING" during retry
  message?: string; // Human-readable status message
  startedAt?: string; // ISO 8601 UTC
  completedAt?: string; // ISO 8601 UTC (only when status is terminal)
}
```

**Status enum** (see [ExecutionSemantics.v1.md § 1.2](./ExecutionSemantics.v1.md#12-append-only-event-model)):

- `PENDING`: Run created, awaiting approval
- `APPROVED`: Approved by planner, ready to start
- `RUNNING`: Currently executing steps
- `PAUSED`: Paused by operator signal
- `COMPLETED`: Successfully finished all steps
- `FAILED`: Terminated due to step failure
- `CANCELLED`: Terminated by operator cancellation

### 2.1.3 Correlation Identifiers (REQUIRED)

All operations and events MUST include these identifiers for traceability:

- **`tenantId`**: Tenant isolation boundary (MUST be validated for every operation)
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

**Resolution for operations without explicit RunContext**:

- `startRun(planRef, context)`: context explicitly includes all correlation IDs ✅
- `cancelRun(engineRunRef)` / `getRunStatus(engineRunRef)` / `signal(engineRunRef, request)`:
  - Engine MUST resolve `tenantId`, `projectId`, `environmentId` from stored run metadata in StateStore using `engineRunRef.runId` or `engineRunRef.workflowId`.
  - Engine MUST validate tenant authorization before processing (RBAC check against resolved `tenantId`).
  - All emitted events/audit logs MUST include resolved correlation IDs.

---

## 2.2 Event Emission Contract

Events are written to `IRunStateStore` (synchronous primary path, source of truth).

**Lifecycle events** (MUST be emitted):

- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

**Event naming convention**: Use PascalCase without `on` prefix (e.g., `RunStarted`, not `onRunStarted`).

**Event contract**:

- Events **MUST** include: `runId`, `stepId` (if applicable), `engineAttemptId`, `logicalAttemptId`, `runSeq`, `idempotencyKey`.
- Events **MUST** be idempotent: same event replayed → same state.
- Idempotency key: `SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)`.
- `runSeq` MUST be **monotonically increasing per runId** (StateStore assigns during write; engine receives assigned seq in write response or reads back).

**State transition mapping** (normative):

| Event          | Status Transition | Notes                                      |
| -------------- | ----------------- | ------------------------------------------ |
| `RunStarted`   | → `RUNNING`       | Workflow execution begins                  |
| `RunPaused`    | → `PAUSED`        | After PAUSE signal acknowledgment          |
| `RunResumed`   | → `RUNNING`       | After RESUME signal acknowledgment         |
| `RunCompleted` | → `COMPLETED`     | All steps succeeded                        |
| `RunFailed`    | → `FAILED`        | Terminal failure (step exhausted retries)  |
| `RunCancelled` | → `CANCELLED`     | After cancelRun() or EMERGENCY_STOP signal |

**Event schema** (base structure, see [ExecutionSemantics.v1.md § 1.2](./ExecutionSemantics.v1.md#12-append-only-event-model) for full RunEventBase):

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

---

## 2.3 Supported Signals Catalog (Complete)

Signals are **operator actions** routed to the engine, **ALWAYS enforced by `IAuthorization`** (RBAC + tenant scoping).

| SignalType        | Payload                                   | RBAC Role | Requires Reason? | Effect                         | Status     |
| ----------------- | ----------------------------------------- | --------- | ---------------- | ------------------------------ | ---------- |
| `PAUSE`           | `{ reason?: string }`                     | Operator  | No               | Pauses future step scheduling  | ✅ Phase 1 |
| `RESUME`          | `{}`                                      | Operator  | No               | Resumes paused run             | ✅ Phase 1 |
| `RETRY_STEP`      | `{ stepId, force?: boolean }`             | Engineer  | No               | Retries failed step            | ✅ Phase 1 |
| `UPDATE_PARAMS`   | `{ params: object }`                      | Admin     | **YES**          | Updates runtime parameters     | ✅ Phase 1 |
| `INJECT_OVERRIDE` | `{ stepId, override: object }`            | Admin     | **YES**          | Injects override for next step | ✅ Phase 1 |
| `ESCALATE_ALERT`  | `{ level: string, note?: string }`        | System    | No               | Triggers escalation            | ✅ Phase 1 |
| `SKIP_STEP`       | `{ stepId, reason?: string }`             | Engineer  | No               | Skips a step                   | ⏳ Phase 2 |
| `UPDATE_TARGET`   | `{ stepId, newTarget: object }`           | Admin     | **YES**          | Changes target schema/db       | ⏳ Phase 2 |
| `EMERGENCY_STOP`  | `{ reason: string, forceKill?: boolean }` | Admin     | **YES**          | Immediate termination          | ⏳ Phase 3 |

**SignalRequest schema** (REQUIRED for idempotency):

```ts
interface SignalRequest {
  signalId: string; // Client-supplied UUID v4 (idempotency key)
  signalType: SignalType;
  payload: Record<string, unknown>; // Signal-specific payload (varies by type)
}
```

**Idempotency rule**:

- `signalId` is client-supplied UUID v4.
- Engine stores handling result via StateStore upsert; repeated `signalId` delivery is a no-op.
- Method signature: `signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>`.

---

## 2.4 Authorization & Signal Decision Records (MANDATORY)

Every signal **MUST** generate a `SignalDecisionRecord` **BEFORE** engine processes it.

**SignalDecisionRecord schema** (mandatory, always persisted):

```ts
interface SignalDecisionRecord {
  signalDecisionId: string; // UUID v4
  signalId: string; // Client-supplied
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED';
  reason?: string;
  policyDecisionId: string; // IAuthorization ref

  audit: {
    actorId: string;
    actorRole: string; // "Operator", "Engineer", "Admin", "System"
    tenantId: string;
    timestamp: string; // ISO 8601 UTC
    reason?: string; // REQUIRED for destructive signals
    sourceIp?: string;
  };

  signalType: SignalType;
  signalPayload: Record<string, unknown>; // Validated by policy/runtime

  engineProcessedAt?: string;
  engineResult?: { status: 'success' | 'failure'; errorCode?: string };

  approvalRequired?: boolean;
  approvedBy?: string;
  approvalTimestamp?: string;
}
```

**IAuthorization contract**:

```ts
interface IAuthorization {
  evaluateSignal(request: {
    actor: { userId: string; roles: string[] };
    signal: { type: SignalType; payload: Record<string, unknown> }; // Validated by policy
    tenantId: string;
    runId: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
    policyDecisionId: string;
  }>;
}
```

**Storage**:

- SignalDecisionRecords MUST be persisted (same database as StateStore, same transaction if possible).
- Retention: **minimum 7 years** (SOC2/GDPR).
- Index by: `(tenantId, runId, timestamp)`.

---

## 3) Execution Plan Contract

### 3.1 PlanRef (Transport Layer) — PRIMARY INPUT

**Normative rule**: `startRun()` accepts **PlanRef**, not `ExecutionPlan` directly.

**Rationale**: Workflow engines (Temporal, Conductor) have strict payload size limits (typically 2MB for Temporal). Full execution plans can exceed this. The engine fetches the full plan from storage via an Activity.

The engine receives a **plan reference** pointing to the full plan stored externally:

```ts
type PlanRef = {
  uri: string; // Opaque URI: https://..., s3://..., gs://..., azure://..., etc.
  sha256: string; // integrity hash
  schemaVersion: string; // MANDATORY, e.g., "v1.2"
  planId: string;
  planVersion: string;

  sizeBytes?: number;
  expiresAt?: string;
};
```

**Versioning rule**:

- `schemaVersion` MANDATORY.
- Engine MUST reject plans with unknown `schemaVersion`.
- BACKWARD compatibility: Engine supports ≤3 minor versions back.
- FORWARD compatibility: Define deprecation policy (e.g., "v1.0 deprecated after 2026-Q3").

**Integrity Validation (NORMATIVE)**:

When the Engine's Worker fetches a plan via `fetchPlan(PlanRef)` Activity:

1. The Worker MUST download the plan from `PlanRef.uri`.
2. The Worker MUST compute the SHA256 hash of the downloaded content.
3. If the computed SHA256 does **NOT match** `PlanRef.sha256`, the Activity MUST:
   - Fail immediately with error code `PLAN_INTEGRITY_VALIDATION_FAILED`
   - NOT proceed with workflow execution
   - Emit a critical alert (P1) to operations/security
   - Log both expected and actual hash values for audit

**Rationale**: This prevents execution of plans that have been modified after approval (e.g., cache poisoning, storage corruption, or malicious tampering).

**See**: [TemporalAdapter § 2.1](../adapters/temporal/TemporalAdapter.spec.md#21-fetchplan-activity-normative-validation) for reference implementation.

### 3.2 ExecutionPlan (Full Plan Structure)

**Usage**: Internal only (after fetching via `PlanRef.uri`). NOT passed to `startRun()` directly except in local/test environments.

```ts
interface ExecutionPlan {
  metadata: {
    planId: string;
    planVersion: string;
    requiresCapabilities?: string[];
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    targetAdapter?: 'temporal' | 'conductor' | 'any';
  };
  steps: Array<{
    stepId: string;
    [key: string]: unknown; // Step-specific fields (adapter-dependent)
  }>;
}
```

**Note**: Full plan schema is defined by Planner contract (out of scope for this doc). Engine validates `metadata.requiresCapabilities` only.

---

## 4) Cross-Adapter Capability Validation

Engine **MUST** validate plan capabilities against adapter before `startRun()`.

**Validation contract**:

```ts
interface ValidationReport {
  planId: string;
  status: 'VALID' | 'WARNINGS' | 'ERRORS';
  errors: { code: string; capability: string; message: string }[];
  warnings: { code: string; message: string }[];
}

async function startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef> {
  // Step 1: Fetch plan from planRef.uri (via Activity)
  const plan = await fetchPlan(planRef);

  // Step 2: Validate capabilities
  const report = await validatePlan(plan, ctx.targetAdapter);

  if (report.status === 'ERRORS' && plan.metadata.fallbackBehavior === 'reject') {
    throw new PlanValidationError('Plan validation failed', report);
  }

  // Step 3: Execute
  return await adapter.startRun(plan, ctx);
}
```

**Capability declarations**:

- `plan.metadata.requiresCapabilities: Capability[]`
- `plan.metadata.fallbackBehavior: "reject" | "emulate" | "degrade"`
- `plan.metadata.targetAdapter: "temporal" | "conductor" | "any"`

See: [capabilities/](../capabilities/) for executable enum + adapter matrix.

---

## 5) References

- **Temporal SDK**: <https://docs.temporal.io/develop/typescript>
- **Temporal Signals**: <https://docs.temporal.io/>
- **Conductor**: <https://conductor.netflix.com/>
- **Execution Semantics**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- **Capabilities**: [capabilities/](../capabilities/)
- **Plugin Sandbox (Extension)**: [extensions/PluginSandbox.v1.0.md](../extensions/PluginSandbox.v1.0.md)
- **TemporalAdapter spec**: [../../adapters/temporal/TemporalAdapter.spec.md](../../adapters/temporal/TemporalAdapter.spec.md)

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                              |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1     | 2026-02-12 | **BREAKING**: Fix contradictions and ambiguities (conductorUrl required, startRun uses PlanRef, signal uses SignalRequest). Add RunStatusSnapshot schema, correlation identifier semantics, RunEventBase structure. Unify event names (RunStarted not onRunStarted), add state transition mapping, clarify correlation ID resolution, remove `any`. |
| 1.0     | 2026-02-11 | Initial normative contract (Temporal + Conductor)                                                                                                                                                                                                                                                                                                   |
