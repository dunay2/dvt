# IWorkflowEngine Contract (Normative v2.0.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 2.0.0  
**Stability**: Contracts — breaking changes require major version bump  
**Consumers**: Planner, State, UI, adapter implementers  
**Sub-Contracts**: [RunEvents.v2.0.md](./RunEvents.v2.0.md), [SignalsAndAuth.v1.1.md](./SignalsAndAuth.v1.1.md), [ExecutionSemantics.v2.0.md](./ExecutionSemantics.v2.0.md)

---

## 1) Engine Boundary

### MUST

- Accept a versioned execution plan **by reference** (`PlanRef`) and execute it reliably.
- Emit run/step lifecycle events persisted in Append Authority (`IRunStateStore`).
- Support retries/backoff according to planner policy.
- Support cancellation and resume semantics.
- Include correlation and attempt identifiers in emitted lifecycle events.

### MUST NOT

- Perform planning policy decisions.
- Become source of truth for state.
- Persist raw plan body or secrets in engine runtime state.

---

## 2) Minimal Interface

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
```

`startRun` MUST accept `PlanRef` (not full `ExecutionPlan`) in normative production mode.

---

## 3) Lifecycle Event Summary

Engine domain MUST emit compatible lifecycle events from [RunEvents.v2.0.md](./RunEvents.v2.0.md):

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

`RunQueued` MAY be emitted by admission control if applicable.

---

## 4) Correlation and Attempts

Events and audit records MUST carry:

- `tenantId`, `projectId`, `environmentId`, `runId`
- `logicalAttemptId`, `engineAttemptId`

Attempt rules:

- `logicalAttemptId` MUST start at `1`.
- `engineAttemptId` MUST be present.
- If provider runtime does not expose attempt values, producer MUST set `engineAttemptId = 1`.
- Producer MUST NOT increment `engineAttemptId` artificially.

---

## 5) Idempotency Alignment

Engine emitters MUST derive event idempotency according to [RunEvents.v2.0.md](./RunEvents.v2.0.md):

```text
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)
```

`engineAttemptId` MUST NOT affect idempotency key derivation.

---

## 6) PlanRef Normative Notes

- `schemaVersion` is REQUIRED.
- engine MUST reject unknown schema versions.
- engine MUST validate plan integrity hash before execution.

---

## 7) Change Log

- **2.0.0 (2026-02-16)**: **MAJOR** — clarified normative input as `PlanRef` (not direct `ExecutionPlan`), aligned lifecycle summary with `StepSkipped`, aligned attempts/idempotency and v2 timestamp model through sub-contract references.
