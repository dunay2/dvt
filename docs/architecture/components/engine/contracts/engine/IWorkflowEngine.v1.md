# IWorkflowEngine Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Scope**: Engine command and read boundary
**Consumers**: API, planner-facing application services, adapters, UI-facing read paths
**Sub-contracts**: [RunEvents.v1.md](./RunEvents.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md), [GlossaryContract.v1.md](./GlossaryContract.v1.md)
**Related ADRs**: [ADR-0003](../../../../../adr/ADR-0003-execution-model.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md), [ADR-0015](../../../../../adr/ADR-0015-getRunStatus-read-model-separation.md), [ADR-0047](../../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md), [ADR-0048](../../../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md), [ADR-0049](../../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md)

---

## Purpose

Define the single active engine boundary for run execution, control, canonical
status reads, and opt-in status enrichment.

## Boundary rules

### MUST

- accept a verified `PlanRef` for `startRun()` and `recoverRun()`
- validate command legality before dispatching to the adapter
- keep event log plus snapshot projection as canonical caller-visible status
  authority
- expose a distinct enrichment path when provider-live diagnostics are needed
- preserve tenant, project, environment, run, and attempt correlation across
  operations

### MUST NOT

- become the source of truth for persisted lifecycle state
- let provider-live status replace the event-log-backed read model
- reuse one semantic status DTO across canonical truth, enrichment, and
  provider diagnostics
- append realized lifecycle facts merely because a command was accepted

## Contract surface

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus>;
  getRunEnrichment(engineRunRef: EngineRunRef): Promise<RunStatusEnrichment>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
```

## Status models

```ts
interface CanonicalRunStatus {
  runId: string;
  status: RunStatus;
  substatus?: RunSubstatus;
  message?: string;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  execution?: RunExecutionEvidence;
}

interface RunStatusEnrichment {
  canonical: CanonicalRunStatus;
  providerView: ProviderRunStatusView;
}
```

`ProviderRunStatusView` is defined by
[IProviderAdapter.v1.md](./IProviderAdapter.v1.md).

### Read-path authority

- `getRunStatus()` returns the canonical caller-visible status owned by the
  event log and snapshot projection.
- `getRunEnrichment()` composes canonical status with provider-live diagnostics.
- `getRunEnrichment()` MUST reject on adapter timeout or failure. It MUST NOT
  silently degrade to `getRunStatus()`.
- canonical `substatus` values belong to the engine-owned read model only.
  Provider-specific status tokens do not belong inside `CanonicalRunStatus`.

### Lifecycle ownership

The runtime execution context owns realized lifecycle facts for signal-driven
transitions, including:

- `RunPaused`
- `RunResumed`
- `RunCancelRequested`
- `RunCancelled`

The engine validates and dispatches commands, but it MUST NOT append those
realized lifecycle events on submission.

### Canonical signal boundary

Canonical `SignalType` is limited to:

- `PAUSE`
- `RESUME`
- `CANCEL`

Dedicated step retry and run recovery remain separate use cases.

## Current implementation note

The shipped engine boundary now matches this split:

- `getRunStatus(): Promise<CanonicalRunStatus>`
- `getRunEnrichment(): Promise<RunStatusEnrichment>`

`AR-A12-C` remains the follow-up slice for downstream-consumer convergence,
legacy-type cleanup, and wider read-surface alignment outside the core engine
boundary itself.

## Related contracts

- [RunEvents.v1.md](./RunEvents.v1.md)
- [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)
- [GlossaryContract.v1.md](./GlossaryContract.v1.md)
- [StartRunProtocol.v1.md](./StartRunProtocol.v1.md)

## Change log

- **1.0 (2026-04-11)**: Modeled explicit canonical status and enrichment objects in the active `v1` engine contract line.
- **1.0 (2026-04-10)**: Reset the active engine boundary to one canonical pre-stable `v1` line, aligned with the real code surface and read-authority model.
