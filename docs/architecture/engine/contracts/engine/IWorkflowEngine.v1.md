# IWorkflowEngine Contract (Normative v1)

> Historical note: references in this v1 surface to `retryStep` as a signal are
> superseded by [ADR-0048](../../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md).
> The current canonical signal boundary no longer includes `RETRY_STEP`.
> Business run recovery is also outside the generic signal boundary; see
> [ADR-0049](../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md).
> References in this v1 surface to engine-owned realized lifecycle events for
> `RunPaused`, `RunResumed`, or `RunCancelled` are superseded by
> [ADR-0047](../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md).
> Those realized lifecycle facts are runtime-owned in the current model.

[Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1  
**Stability**: Draft baseline (subject to controlled changes)  
**Consumers**: Planner, Engine, State Store, UI  
**Supersedes**: None  
**Reference artifact**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)

---

## 1) Purpose

Define the minimum, unambiguous contract for workflow execution orchestration.

This baseline is intentionally small and normative for the blocked base-contract
workstream (#133).

---

## 2) Engine boundary

### MUST

- Start a run from a validated plan reference.
- Cancel a run.
- Return run status.
- Accept runtime signals (`PAUSE`, `RESUME`, `CANCEL`).
- Persist run and step lifecycle events through the event pipeline.
- Include correlation identifiers on operations/events: `tenantId`,
  `projectId`, `environmentId`, `runId`.

### MUST NOT

- Perform planning or step ordering decisions.
- Be source of truth for final state (State Store is authoritative).
- Persist secrets.

---

## 3) Minimal contract surface

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

## 4) Plan input contract (v1)

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
- Engine MUST reject disallowed URI schemes (`file://`, `ftp://`, link-local
  metadata endpoints).

---

## 5) Event and idempotency baseline

The execution system MUST persist at least:

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

For signal-driven realized lifecycle events:

- `RunPaused`, `RunResumed`, and `RunCancelled` are runtime-owned facts;
- the engine core validates and dispatches the command, but MUST NOT append the
  same realized lifecycle event on submission.

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

- `idempotencyKey` MUST be derived from `logicalAttemptId` (not
  `engineAttemptId`).

---

## 6) Signals baseline

```ts
type SignalType = 'PAUSE' | 'RESUME' | 'CANCEL';

interface SignalRequest {
  signalId: string;
  type: SignalType;
  reason?: string;
}
```

Rules:

- `RETRY_RUN` is not part of canonical `SignalType`; business recovery
  requires a dedicated engine or application use case per ADR-0040 and
  ADR-0049.
- `RETRY_STEP` is not part of canonical `SignalType`; future step retry
  requires a dedicated use case per ADR-0048.
- Signal operations MUST be tenant-authorized before execution.
- Signal idempotency key MUST include `(tenantId, runId, signalId)`.

---

## 7) Out of scope for v1

- Substatus taxonomy and adapter-scoped substatus extensions.
- Full capability validation matrix and fallback policies (`emulate` /
  `degrade`).
- Extended glossary governance.

These are formalized in [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)
and linked sub-contracts.

---

## 8) Change log

- **v1 (2026-02-16)**: Initial draft baseline contract for domain-contract
  bootstrap (#133).
- **v1 (2026-04-08)**: Clarified runtime-owned realized lifecycle ownership for
  signal-driven events and aligned the baseline signal contract with ADR-0047,
  ADR-0048, and ADR-0049.
