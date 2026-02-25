# IWorkflowEngine Contract (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1  
**Stability**: Draft baseline (subject to controlled changes)  
**Consumers**: Planner, Engine, State Store, UI  
**Supersedes**: None  
**Reference artifact**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)

---

## 1) Purpose

Define the minimum, unambiguous contract for workflow execution orchestration.

This baseline is intentionally small and normative for the blocked base-contract workstream (#133).

---

## 2) Engine Boundary

### MUST

- Start a run from a validated plan reference.
- Cancel a run.
- Return run status.
- Accept runtime signals (`pause`, `resume`, `retryStep`).
- Emit run and step lifecycle events through the event pipeline.
- Include correlation identifiers on operations/events: `tenantId`, `projectId`, `environmentId`, `runId`.

### MUST NOT

- Perform planning or step ordering decisions.
- Be source of truth for final state (State Store is authoritative).
- Persist secrets.

---

## 3) Minimal Contract Surface

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
```

### 3.1 RunContext

```ts
interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string; // globally unique, UUID v4 recommended
  targetAdapter: 'temporal' | 'conductor';
}
```

### 3.2 EngineRunRef

```ts
type EngineRunRef =
  | {
      provider: 'temporal';
      namespace: string;
      workflowId: string;
      runId: string;
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      workflowId: string;
      runId: string;
      conductorUrl: string;
    };
```

**Invariants**:

- `runId` is REQUIRED for both providers.
- Temporal refs MUST include `namespace`.
- Conductor refs MUST include `conductorUrl`.

### 3.3 RunStatusSnapshot

```ts
type RunStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

interface RunStatusSnapshot {
  runId: string;
  status: RunStatus;
  message?: string;
  startedAt?: string; // ISO 8601 UTC
  completedAt?: string; // ISO 8601 UTC when terminal
}
```

---

## 4) Plan Input Contract (v1)

`startRun()` accepts `PlanRef`.

```ts
type PlanRef = {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
};
```

### Normative checks

- Engine MUST reject unknown `schemaVersion`.
- Engine MUST validate plan integrity (`sha256`) before execution.
- Engine MUST reject disallowed URI schemes (`file://`, `ftp://`, link-local metadata endpoints).

---

## 5) Event and Idempotency Baseline

Engine MUST emit at least:

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

Minimum event envelope fields:

- `tenantId`
- `projectId`
- `environmentId`
- `runId`
- `stepId` (required for step-level events)
- `planId`
- `planVersion`
- `eventType`
- `runSeq` (assigned by append authority)
- `idempotencyKey`
- `logicalAttemptId`
- `engineAttemptId`
- `emittedAt`
- `persistedAt` (required on persisted records)

Idempotency rule (normative):

- `idempotencyKey` MUST be derived from `logicalAttemptId` (not `engineAttemptId`).

---

## 6) Signals Baseline

```ts
type SignalType = 'pause' | 'resume' | 'retryStep';

interface SignalRequest {
  signalId: string;
  type: SignalType;
  stepId?: string; // required for retryStep
  reason?: string;
}
```

Rules:

- `retryStep` MUST include `stepId`.
- Signal operations MUST be tenant-authorized before execution.
- Signal idempotency key MUST include `(tenantId, runId, signalId)`.

---

## 7) Out of Scope for v1

- Substatus taxonomy and adapter-scoped substatus extensions.
- Full capability validation matrix and fallback policies (`emulate`/`degrade`).
- Extended glossary governance.

These are formalized in [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md) and linked sub-contracts.

---

## 8) Change Log

- **v1 (2026-02-16)**: Initial draft baseline contract for domain-contract bootstrap (#133).
