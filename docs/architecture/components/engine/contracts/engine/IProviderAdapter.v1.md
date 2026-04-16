# IProviderAdapter Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Scope**: Provider adapter boundary between engine core and execution runtimes
**Consumers**: WorkflowEngine, adapter implementations, maintenance services, health/reporting paths
**Related contracts**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md), [IRunEnrichmentService.v1.md](./IRunEnrichmentService.v1.md), [RunEvents.v1.md](./RunEvents.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md), [GlossaryContract.v1.md](./GlossaryContract.v1.md)
**Related ADRs**: [ADR-0012](../../../../../adr/ADR-0012-plan-integrity-ownership.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md), [ADR-0015](../../../../../adr/ADR-0015-getRunStatus-read-model-separation.md), [ADR-0030](../../../../../adr/ADR-0030-pre-dispatch-intent-log.md)

---

## Purpose

Define the single active adapter boundary used by the engine to start, control,
and observe provider runtimes without conflating provider diagnostics with
canonical status truth.

## Boundary rules

### MUST

- expose a stable `provider` discriminator compatible with `EngineRunRef`
- accept the engine-verified `ExecutionPlan` plus its `PlanRef`
- submit provider-native cancellation through `cancelRun()`
- return provider-live observation through `getProviderStatusView()` for
  enrichment and diagnostics only
- expose `signalSemanticsVersions()` so the engine can fail closed on signal
  mapping drift
- preserve correlation inputs across downstream runtime calls

### MUST NOT

- become source of truth for caller-visible lifecycle state
- perform planner decisions or mutate plan semantics
- present provider-live status as canonical status authority
- collapse provider-private control semantics into the canonical engine signal
  boundary
- reuse canonical `RunStatus` tokens as the primary diagnostic status model

## Contract surface

```ts
interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  startRun(plan: ExecutionPlan, planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  signalSemanticsVersions(): readonly SignalSemanticsVersion[];
  ping?(): Promise<void>;
  estimateRunRef?(ctx: ResolvedRunContext): EngineRunRef;
  capabilities?(): readonly string[];
  lookupRunRef?(runId: string, tenantId: string): Promise<EngineRunRef | null>;
}
```

## Diagnostic status model

```ts
interface ProviderRunStatusView {
  provider: EngineRunRef['provider'];
  providerStatus: string;
  providerSubstatus?: string;
  message?: string;
  observedAt?: IsoUtcString;
}
```

## Semantics

- `startRun()` uses the engine-verified plan plus its originating `PlanRef`.
- `cancelRun()` is an idempotent provider-native cancellation request.
- `getProviderStatusView()` returns provider-live observation suitable for
  diagnostics and enrichment.
- provider status MUST NOT be treated as the canonical public source of truth.
- provider status tokens remain provider-native strings and must not redefine
  canonical lifecycle meaning.
- `signal()` remains the canonical control boundary for cooperative signals.

## Optional extensions

| Method              | Consumer                                      | Behavior when absent          |
| ------------------- | --------------------------------------------- | ----------------------------- |
| `ping?()`           | health/reporting                              | health check skipped          |
| `estimateRunRef?()` | start-run pre-bootstrap path                  | adapter-start-first path used |
| `capabilities?()`   | capability gate                               | gate skipped                  |
| `lookupRunRef?()`   | `RunMaintenanceService` intent reconciliation | provider verification skipped |

## Diagram reading rule

`getProviderStatusView()` in this contract means provider-live observation.
Canonical caller-visible status remains engine-owned through the event-log-backed
read model.

## Current implementation note

The shipped adapter boundary now matches this split:

- `getProviderStatusView(): Promise<ProviderRunStatusView>`
- active runtime/docs now treat provider status as diagnostic-only and keep the
  caller-visible canonical read on `IWorkflowEngine.getRunStatus()`

## Change log

- **1.0 (2026-04-11)**: Modeled explicit provider-live diagnostics in the active `v1` adapter contract line.
- **1.0 (2026-04-10)**: Reset the active adapter boundary to one canonical pre-stable `v1` line and aligned it with the real adapter code surface.
