# IWorkflowEngine Contract (Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
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
- Support **resuming / continuing** after transient failures.
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
  startRun(executionPlan: ExecutionPlan, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(
    engineRunRef: EngineRunRef,
    signalType: SignalType,
    payload: Record<string, any>
  ): Promise<void>;
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
      conductorUrl?: string;
    };
```

**Invariants**:

- `namespace` (Temporal) or `conductorUrl` (Conductor) MUST be present.
- `runId` SHOULD be present for cancellation/query operations.
- For debugging, include `taskQueue` (Temporal) to trace worker routing.

---

## 2.2 Event Emission Contract

Events are written to `IRunStateStore` (synchronous primary path, source of truth).

**Lifecycle events** (MUST be emitted):

- `onRunStarted`
- `onStepStarted`
- `onStepCompleted`
- `onStepFailed`
- `onRunCompleted`
- `onRunFailed`
- `onRunCancelled`

**Event contract**:

- Events **MUST** include: `runId`, `stepId` (if applicable), `engineAttemptId`, `logicalAttemptId`, `runSeq`, `idempotencyKey`.
- Events **MUST** be idempotent: same event replayed → same state.
- Idempotency key: `SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)`.

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

**Idempotency rule**:

- `signalId` is client-supplied UUID.
- Engine stores handling result via StateStore upsert; repeated `signalId` delivery is a no-op.

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
  signalPayload: Record<string, any>;

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
    signal: { type: SignalType; payload: Record<string, any> };
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

## 3) Execution Plan Minimal Contract

### 3.1 PlanRef (Transport Layer)

The engine receives a **plan reference**, not the full plan (Temporal payload limits).

```ts
type PlanRef = {
  uri: string; // e.g., s3://bucket/plans/{planId}.json
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

async function startRun(plan: ExecutionPlan, ctx: RunContext): Promise<EngineRunRef> {
  const report = await validatePlan(plan, ctx.targetAdapter);

  if (report.status === 'ERRORS' && plan.metadata.fallbackBehavior === 'reject') {
    throw new PlanValidationError('Plan validation failed', report);
  }

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

| Version | Date       | Change                                            |
| ------- | ---------- | ------------------------------------------------- |
| 1.0     | 2026-02-11 | Initial normative contract (Temporal + Conductor) |
