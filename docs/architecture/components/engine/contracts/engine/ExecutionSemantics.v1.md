# Execution Semantics Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Consumers**: Engine runtime, adapters, append authority, projectors, audit pipelines
**Related Contracts**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md), [IRunEnrichmentService.v1.md](./IRunEnrichmentService.v1.md), [IProviderAdapter.v1.md](./IProviderAdapter.v1.md), [RunEvents.v1.md](./RunEvents.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md), [GlossaryContract.v1.md](./GlossaryContract.v1.md), [State Store Contract](../state-store/README.md)
**Related ADRs**: [ADR-0004](../../../../../adr/ADR-0004-event-sourcing-strategy.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md), [ADR-0015](../../../../../adr/ADR-0015-getRunStatus-read-model-separation.md), [ADR-0047](../../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md)

---

## Core model

Execution state is defined by an append-only event stream per `runId`.

Authorities:

- ordering authority: `runSeq`
- duplicate authority: `(runId, idempotencyKey)`
- time-window authority: `persistedAt`

Projectors MUST order by `runSeq`, not by timestamps.

## Event and attempt rules

- `logicalAttemptId` starts at `1`
- `engineAttemptId` MUST be present on every event
- if the provider does not expose attempt values, the producer MUST set `engineAttemptId = 1`
- producers MUST NOT increment `engineAttemptId` artificially

## Lifecycle ownership

The boundary is split into four planes:

1. command plane: engine validates, authorizes, and dispatches
2. realized lifecycle plane: runtime execution context appends realized facts
3. canonical read plane: event log plus snapshot remain caller-visible truth
4. provider diagnostics plane: provider-live status is enrichment only

For signal-driven transitions this means:

- the engine dispatches `signal(...)` or `cancelRun()`
- the runtime appends `RunPaused`, `RunResumed`, `RunCancelRequested`, and `RunCancelled` when those states are actually reached
- the engine MUST NOT append those realized lifecycle events merely because a command was accepted

## Status model split

### `CanonicalRunStatus`

`CanonicalRunStatus` is derived from the snapshot projector.
It is the canonical caller-visible status object.

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

Rules:

- canonical status and substatus are owned by the event-log-backed read model
- provider-scoped status tokens MUST NOT appear inside `CanonicalRunStatus`
- caller-visible `execution.materialization` is success-only and MUST be
  omitted unless `status = COMPLETED`
- caller-visible failed-run truth uses `execution.failure.*`, not a mixed
  `failure + materialization` read shape

Cancellation projection rules:

- `RunCancelRequested` keeps `status = RUNNING`
- `RunCancelRequested` sets `substatus = CANCELLING`
- `RunCancelled` moves the canonical status to `CANCELLED`

### `ProviderRunStatusView`

`ProviderRunStatusView` is a diagnostic-only runtime observation object.

```ts
interface ProviderRunStatusView {
  provider: EngineRunRef['provider'];
  providerStatus: string;
  providerSubstatus?: string;
  message?: string;
  observedAt?: IsoUtcString;
}
```

Rules:

- provider tokens remain provider-native strings
- provider observation MUST NOT replace canonical lifecycle truth

### `RunStatusEnrichment`

`RunStatusEnrichment` is the engine-owned composition of canonical truth plus
provider diagnostics.

```ts
interface RunStatusEnrichment {
  canonical: CanonicalRunStatus;
  providerView: ProviderRunStatusView;
}
```

Rules:

- enrichment augments canonical truth; it does not rewrite it
- failure to obtain provider diagnostics fails the enrichment path rather than
  fabricating a canonical-only enrichment result

## Read authority

- `IWorkflowEngine.getRunStatus()` is the canonical caller-visible read path
- `IRunEnrichmentService.getRunEnrichment()` composes canonical status plus
  provider diagnostics
- `IProviderAdapter.getProviderStatusView()` is a diagnostic-only provider
  observation path

## Current implementation note

The shipped public read boundary now reflects this split:

- engine canonical reads use `CanonicalRunStatus`
- enrichment service uses `RunStatusEnrichment`
- adapter live diagnostics use `ProviderRunStatusView`

`AR-A12-C3` remains the follow-up slice for current-doc and diagram convergence
outside the public typed boundary.

## Append authority responsibilities

Append authority MUST enforce:

- monotonic `runSeq` assignment per run
- duplicate detection on `(runId, idempotencyKey)`
- immutable persisted records
- deterministic duplicate return-existing behavior

## Change log

- **1.0 (2026-04-12)**: Clarified that caller-visible `execution.materialization` is success-only and omitted outside `COMPLETED`.
- **1.0 (2026-04-11)**: Split canonical status, enrichment, and provider-live diagnostics in the active execution-semantics contract line.
- **1.0 (2026-04-11)**: Narrowed read authority so enrichment belongs to `IRunEnrichmentService`, not `IWorkflowEngine`.
- **1.0 (2026-04-10)**: Reset the active execution-semantics contract to one canonical pre-stable `v1` line and aligned it with the current event-sourcing and read-authority model.
