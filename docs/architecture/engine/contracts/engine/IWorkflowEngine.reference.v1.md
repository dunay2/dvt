# IWorkflowEngine Contract (Reference v1)

[? Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Planner, State, UI  
**Sub-Contracts**: [RunEvents.v1.md](./RunEvents.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)  
**References**: [Temporal SDK](https://docs.temporal.io/develop/typescript), [Conductor API](https://github.com/netflix/conductor/wiki)

---

## 1) Engine Boundary: MUST / MUST NOT

### MUST

- Accept a **versioned** `ExecutionPlan` and execute its steps reliably.
- Emit **run/step lifecycle events** (persisted into `IRunStateStore`).
- Support retries/backoff as specified by Planner policy (engine-agnostic rules).
- Support cancellation and "stop" semantics.
- Support **resuming / continuing** after transient failures (see [ExecutionSemantics.v1.md § 2](./ExecutionSemantics.v1.md#2-resume-semantics) for resume semantics: PAUSE/RESUME signals, step replay rules, at-least-once vs exactly-once guarantees).
- Provide correlation identifiers: `tenantId`, `projectId`, `environmentId`, `runId`, `engineAttemptId`, `logicalAttemptId`.

### MUST NOT

- Perform planning (ordering/skip/cost decisions belong to `IExecutionPlanner`).
- Become the source of truth for state (`IRunStateStore` is the source of truth).
- Store secrets (`ISecretsProvider` handles that).
- Persist secrets or plan bodies (use `PlanRef` for storage-agnostic retrieval). Engine MAY persist minimal run metadata needed to resolve correlation IDs for non-start operations (cancel/status/signal).

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
  runId: string; // MUST be globally unique; UUID v4 RECOMMENDED
  targetAdapter: 'temporal' | 'conductor';
}

// Adapter selection MUST be resolved before invoking startRun()
// (e.g., by a higher-level coordinator using deployment config and/or plan.metadata.targetAdapter)
```

### 2.1.1 EngineRunRef (Structured, Adapter-Polymorphic)

```ts
type EngineRunRef =
  | {
      provider: 'temporal';
      namespace: string;
      workflowId: string;
      runId: string; // REQUIRED (used in signal idempotency key)
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      workflowId: string;
      runId: string; // REQUIRED (used in signal idempotency key)
      conductorUrl: string; // REQUIRED per invariant below
    };
```

**Invariants**:

- `namespace` (Temporal) MUST be present for Temporal provider.
- `conductorUrl` (Conductor) MUST be present for Conductor provider.
- `runId` MUST be present for all operations (cancellation, query, signal). Used in signal idempotency key: `(tenantId, runId, signalId)`.
- For debugging, include `taskQueue` (Temporal) to trace worker routing.

---

### 2.1.2 RunStatusSnapshot (Status Query Result)

```ts
type RunSubstatus =
  | 'DRAINING' // Pause in progress (Conductor)
  | 'RETRYING' // Step retry in progress
  | 'CONTINUE_AS_NEW' // Temporal history rotation
  | 'WAITING_APPROVAL' // Blocked on planner approval
  | 'RECOVERING'; // After worker crash / worker recovery

type AdapterScopedSubstatus = `${'temporal' | 'conductor' | 'mock'}/${string}`;

interface RunStatusSnapshot {
  runId: string;
  status: RunStatus; // 'PENDING' | 'APPROVED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  substatus?: RunSubstatus | AdapterScopedSubstatus;
  message?: string; // Human-readable status message
  startedAt?: string; // ISO 8601 UTC
  completedAt?: string; // ISO 8601 UTC (only when status is terminal)
}
```

**Substatus rules**:

- Adapters MUST use canonical `RunSubstatus` values when applicable.
- If an adapter needs a custom substatus, it MUST use the adapter-scoped format: `<adapter>/<VALUE>` (e.g., `temporal/WORKFLOW_TASK_BACKLOG`).
- UI MUST treat unknown substatus values as opaque and display them verbatim.
- **Conductor PAUSE (NORMATIVE)**: `PAUSED` reflects that Conductor stops scheduling _new_ tasks. In-flight tasks **MUST be allowed to finish** because Conductor lacks cancellation tokens. While those tasks drain, adapters MUST emit `substatus = 'DRAINING'`. UI/API MUST expose both `PAUSED` status and `DRAINING` substatus until all running tasks complete.

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
- **`runId`**: Unique identifier for this workflow run (MUST be globally unique; UUID v4 RECOMMENDED)
- **`engineAttemptId`**: Physical attempt counter (engine/worker restarts, infra retries)
  - Increments on: workflow restart, worker crash recovery, continue-as-new
  - Used for: debugging, infra failure detection, cost attribution
- **`logicalAttemptId`**: Logical attempt counter (step/run retries per planner policy)
  - Increments on: explicit RETRY_STEP signal, automatic retry per plan policy
  - Used for: deterministic replay, idempotency key generation, user-visible attempt count

**Semantic difference**:

- `engineAttemptId` = "how many times did the infrastructure restart this?"
- `logicalAttemptId` = "how many times did the user/policy retry this step?"

**Idempotency rule (NORMATIVE)**:

- Event `idempotencyKey` MUST be derived from `logicalAttemptId`, NOT `engineAttemptId`.
- `engineAttemptId` MUST be present in events/audit logs for debugging, but MUST NOT affect idempotency.
- Rationale: Infrastructure retries (network blips, worker restarts) → same logical attempt → same idempotency key. This prevents false duplicates or collisions during infra retries.

**Correlation ID resolution mechanism**:

The resolution mechanism is adapter-specific. Each adapter MUST implement correlation-id resolution from its native identifiers.

- `runId` is the universal lookup key and MUST be resolvable for all providers.
- StateStore MUST support queries by:
  - `runId` (universal), and
  - `(provider, workflowId, providerRunId)` (adapter-specific), where applicable.

**Resolution for operations without explicit RunContext**:

- `startRun(planRef, context)`: context explicitly includes all correlation IDs ✅
- `cancelRun(engineRunRef)` / `getRunStatus(engineRunRef)` / `signal(engineRunRef, request)`:
  - Engine MUST resolve `tenantId`, `projectId`, `environmentId` from stored run metadata in StateStore using `engineRunRef.runId` or `engineRunRef.workflowId`.
  - Engine MUST validate tenant authorization before processing (RBAC check against resolved `tenantId`).
  - All emitted events/audit logs MUST include resolved correlation IDs.

---

## 2.2 Event Emission Contract

**See**: [RunEvents.v1.md](./RunEvents.v1.md) for complete event schema, idempotency rules, and state transition mapping.

**Summary**:

- Engine emits lifecycle events: `RunStarted`, `StepStarted`, `StepCompleted`, `StepFailed`, `RunPaused`, `RunResumed`, `RunCompleted`, `RunFailed`, `RunCancelled`
- Events MUST include: `runId`, `stepId` (if applicable), `engineAttemptId`, `logicalAttemptId`, `runSeq`, `idempotencyKey`
- Event naming: PascalCase without `on` prefix (e.g., `RunStarted`, not `onRunStarted`)
- StateStore assigns `runSeq` during write; engine receives assigned seq in write response

**RunQueued ownership**:

- `RunQueued` is emitted by the Run Queue / Admission Control component (see [ExecutionSemantics.v1.md § 3](./ExecutionSemantics.v1.md#3-backpressure-and-admission-control)).
- If admission control is implemented inside the Engine adapter, the adapter MUST emit `RunQueued` using the same event schema; otherwise, the external queue component emits it.

---

## 2.3 Signals and Authorization

**See**: [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md) for complete signal catalog, authorization rules, and audit requirements.

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

**See**: [TemporalAdapter § 2.1](../../adapters/temporal/TemporalAdapter.spec.md#21-fetchplan-activity-normative-validation) for reference implementation.

#### 3.1.1 PlanRef URI Allowlist (Security - NORMATIVE)

The Engine MUST validate that `PlanRef.uri` matches a configured allowlist of approved schemes and approved locations (domains/buckets/accounts/containers).

- URIs that do not match the allowlist MUST be rejected with error code `PLAN_URI_NOT_ALLOWED`.
- The Engine MUST explicitly reject dangerous/local schemes such as: `file://`, `ftp://`, `gopher://`, and link-local / metadata endpoints (cloud instance metadata).
- The allowlist MUST be enforced before any fetch attempt.

**Operational note (non-normative)**: This mitigates SSRF and internal network exfiltration if an attacker injects a malicious PlanRef.

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

**Adapter narrowing rule (NORMATIVE)**:

- Adapters MUST validate and narrow step payload types (`steps[].unknown` fields) before execution.
- Unrecognized fields MUST be rejected with error code `INVALID_STEP_SCHEMA`.

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

  // For emulate/degrade: Engine MUST emit RunStarted with warnings
  if (report.status === 'WARNINGS' && plan.metadata.fallbackBehavior !== 'reject') {
    // Include ValidationReport reference in artifacts/metadata
    // Emit RunStarted with degraded mode indicator
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
- **Temporal Signals**: <https://docs.temporal.io/workflows>
- **Conductor**: <https://github.com/netflix/conductor/wiki>
- **Sub-Contracts**:
  - [RunEvents.v1.md](./RunEvents.v1.md) — Event schema, idempotency, state transitions
  - [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md) — Signal catalog, authorization, audit
- **Execution Semantics**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- **Capabilities**: [capabilities/](../capabilities/)
- **Plugin Sandbox (Extension)**: [extensions/PluginSandbox.v1.md](../extensions/PluginSandbox.v1.md)
- **TemporalAdapter spec**: [../../adapters/temporal/TemporalAdapter.spec.md](../../adapters/temporal/TemporalAdapter.spec.md)

---

## Terminology Consistency

**Event envelope timestamp field**:

- Event envelope time field MUST be named `emittedAt` across all event schemas and examples.
- `occurredAt` is reserved (if ever introduced) for domain/business timestamps and MUST NOT replace `emittedAt` without a major version bump.

**Event naming convention**:

- Event names MUST be PascalCase (e.g., `RunStarted`). `onRunStarted`-style names MUST NOT appear in normative docs.

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1   | 2026-02-12 | **PATCH**: Fix idempotency key contradiction (derived from logicalAttemptId only, NOT engineAttemptId). Update references to ExecutionSemantics v1.1.1. Add substatus enum (RunSubstatus + adapter-scoped format). Remove targetAdapter 'auto' (resolved before startRun). Add PlanRef URI allowlist security rule (SSRF/RCE mitigation). Add ExecutionPlan narrowing rule. Define emulate/degrade validation outcomes. Add terminology consistency note (emittedAt, PascalCase events). Add RunQueued ownership clarification. Update Conductor reference link. Clarify engine persistence boundary and correlation ID resolution mechanism. Fix runId type (globally unique, UUID v4 RECOMMENDED). |
| 1.1     | 2026-02-12 | **BREAKING**: Fix contradictions and ambiguities (conductorUrl required, startRun uses PlanRef, signal uses SignalRequest). Add RunStatusSnapshot schema, correlation identifier semantics. Unify event names (RunStarted not onRunStarted), add state transition mapping, clarify correlation ID resolution, remove `any`. **PARTITION**: Extract RunEvents.v1.md and SignalsAndAuth.v1.md to reduce churn. **Fix EngineRunRef.runId**: Make REQUIRED for signal idempotency.                                                                                                                                                                                                                       |
| 1.0     | 2026-02-11 | Initial normative contract (Temporal + Conductor)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
