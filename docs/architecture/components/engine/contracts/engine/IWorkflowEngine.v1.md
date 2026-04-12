# IWorkflowEngine Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Scope**: Engine command and canonical-read boundary
**Consumers**: API, planner-facing application services, adapters, UI-facing read paths
**Sub-contracts**: [RunEvents.v1.md](./RunEvents.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md), [GlossaryContract.v1.md](./GlossaryContract.v1.md), [IRunEnrichmentService.v1.md](./IRunEnrichmentService.v1.md), [StartRunBoundary.v1.md](./StartRunBoundary.v1.md)
**Related ADRs**: [ADR-0003](../../../../../adr/ADR-0003-execution-model.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md), [ADR-0015](../../../../../adr/ADR-0015-getRunStatus-read-model-separation.md), [ADR-0047](../../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md), [ADR-0048](../../../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md), [ADR-0049](../../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md)

---

## Purpose

Define the single active engine boundary for run execution, control, and
canonical status reads.

The wider API start-run orchestration boundary is documented separately in
[StartRunBoundary.v1.md](./StartRunBoundary.v1.md). `IWorkflowEngine` remains
the narrower verified-execution facade, not the planner-backed public command
transport.

## Boundary rules

### MUST

- accept a verified `PlanRef` for `startRun()` and `recoverRun()`
- validate command legality before dispatching to the adapter
- keep event log plus snapshot projection as canonical caller-visible status
  authority
- preserve tenant, project, environment, run, and attempt correlation across
  operations

### MUST NOT

- become the source of truth for persisted lifecycle state
- let provider-live status replace the event-log-backed read model
- reuse one semantic status DTO across canonical truth, enrichment, and
  provider diagnostics
- append realized lifecycle facts merely because a command was accepted
- own the provider-backed enrichment boundary

## Contract surface

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus>;
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
```

### Read-path authority

- `getRunStatus()` returns the canonical caller-visible status owned by the
  event log and snapshot projection.
- provider-backed enrichment lives behind
  [IRunEnrichmentService.v1.md](./IRunEnrichmentService.v1.md).
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

The shipped public engine facade now matches this contract line:

- `getRunStatus(): Promise<CanonicalRunStatus>`

Optional provider-backed enrichment now lives behind
`IRunEnrichmentService.getRunEnrichment()`, not on `IWorkflowEngine`.

## Related contracts

- [RunEvents.v1.md](./RunEvents.v1.md)
- [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- [IRunEnrichmentService.v1.md](./IRunEnrichmentService.v1.md)
- [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)
- [GlossaryContract.v1.md](./GlossaryContract.v1.md)
- [StartRunBoundary.v1.md](./StartRunBoundary.v1.md)
- [StartRunProtocol.v1.md](./StartRunProtocol.v1.md)

## Change log

- **1.0 (2026-04-11)**: Narrowed the normative engine facade to commands plus canonical read only and moved enrichment to `IRunEnrichmentService`.
- **1.0 (2026-04-11)**: Landed the public code cutover so `WorkflowEngine` no longer exposes `getRunEnrichment()`.
- **1.0 (2026-04-11)**: Modeled explicit canonical status and enrichment objects in the active `v1` engine contract line.
- **1.0 (2026-04-10)**: Reset the active engine boundary to one canonical pre-stable `v1` line, aligned with the real code surface and read-authority model.
