# IRunEnrichmentService Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Scope**: Optional provider-backed run-status enrichment boundary
**Consumers**: API query/use-case layer, engine composition roots, UI-facing enriched read paths
**Related contracts**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md), [IProviderAdapter.v1.md](./IProviderAdapter.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [GlossaryContract.v1.md](./GlossaryContract.v1.md)
**Related ADRs**: [ADR-0003](../../../../../adr/ADR-0003-execution-model.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md), [ADR-0015](../../../../../adr/ADR-0015-getRunStatus-read-model-separation.md)

---

## Purpose

Define the single active boundary for optional engine-owned enrichment that
combines canonical run status with provider-live diagnostics.

## Boundary rules

### MUST

- accept an `EngineRunRef`
- compose canonical read truth with provider-live diagnostics
- fail closed when provider diagnostics time out or fail
- preserve tenant, project, environment, run, and attempt correlation

### MUST NOT

- silently degrade to canonical-only success when provider diagnostics fail
- replace canonical lifecycle truth with provider-live tokens
- collapse the enrichment path back into `IWorkflowEngine`

## Contract surface

```ts
interface IRunEnrichmentService {
  getRunEnrichment(engineRunRef: EngineRunRef): Promise<RunStatusEnrichment>;
}
```

## Read-path authority

- `IWorkflowEngine.getRunStatus()` remains the canonical caller-visible read
  path
- `IRunEnrichmentService.getRunEnrichment()` is the explicit optional
  enrichment path
- `IProviderAdapter.getProviderStatusView()` remains the provider-diagnostic
  probe used by the enrichment path

## Current implementation note

The shipped code now treats enrichment as a dedicated service boundary.

- `WorkflowEngine` exposes canonical read only
- `IRunEnrichmentService.getRunEnrichment()` is the active provider-backed
  enrichment path

## Related contracts

- [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md)
- [IProviderAdapter.v1.md](./IProviderAdapter.v1.md)
- [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)
- [GlossaryContract.v1.md](./GlossaryContract.v1.md)

## Change log

- **1.0 (2026-04-11)**: Introduced explicit optional enrichment service boundary as part of `AR-A12-C1` read-boundary purity cutover.
- **1.0 (2026-04-11)**: Landed `AR-A12-C2` so shipped code now routes enrichment through the dedicated service boundary.
