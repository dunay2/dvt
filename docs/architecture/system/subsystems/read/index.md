---
title: Read subsystem
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-12
---

# Read subsystem

The read subsystem covers operator-facing retrieval of run lists, run detail,
run timeline, and the supporting workspace context needed to inspect runtime
state.

It is a cross-component flow. The subsystem does not own its own package.

## Primary Flow

```mermaid
flowchart LR
  Operator["Operator"] --> Web["apps/web"]
  Web --> Api["apps/api"]
  Api --> ListRuns["ListRunsUseCase"]
  Api --> GetRun["GetRunStatusUseCase"]
  Api --> GetEvents["GetRunEventsUseCase"]
  ListRuns --> StateRead["IRunStateStoreRead.listRuns + getSnapshot"]
  GetRun --> Engine["IWorkflowEngine.getRunStatus"]
  GetRun --> Enrich["IRunEnrichmentService.getRunEnrichment when query.enriched = true"]
  GetRun --> Metadata["IRunStateStoreRead.getRunMetadataByRunId"]
  GetEvents --> EventStore["IRunStateStoreRead.listEvents"]
  Engine --> StateRead
  Enrich --> Provider["IProviderAdapter.getProviderStatusView (live provider view)"]
  Api --> Web
```

## Source Of Truth Rules

- run-list summaries are read from state-store metadata plus snapshot status;
- run detail starts from run metadata and engine-backed snapshot status;
- provider live status can enrich operator detail, but it must not override the
  canonical event-log-backed status returned by `getRunStatus`;
- timeline events come from event-store reads, not from the summary list path;
- the web shell renders read results, but it does not derive runtime truth by
  itself.

## Canonical Components In This Flow

- [web](../../../components/web/index.md)
- [apps/api](../../../components/api/index.md)
- [@dvt/engine](../../../components/engine/index.md)
- [@dvt/delivery](../../../components/delivery/index.md)

## Code Anchors

- web route and workspace wiring:
  [RunsView.tsx](../../../../../apps/web/src/app/views/RunsView.tsx),
  [useRunWorkspace.ts](../../../../../apps/web/src/app/views/runs/useRunWorkspace.ts),
  [runWorkspaceFacade.ts](../../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts),
  [runsService.ts](../../../../../apps/web/src/app/services/runs/runsService.ts)
- API entrypoints:
  [listRunsRoute.ts](../../../../../apps/api/src/entrypoints/http/listRunsRoute.ts),
  [getRunRoute.ts](../../../../../apps/api/src/entrypoints/http/getRunRoute.ts),
  [getRunEventsRoute.ts](../../../../../apps/api/src/entrypoints/http/getRunEventsRoute.ts)
- API read services:
  [listRunsUseCase.ts](../../../../../apps/api/src/application/services/listRunsUseCase.ts),
  [getRunStatusUseCase.ts](../../../../../apps/api/src/application/services/getRunStatusUseCase.ts)
- engine read surface:
  [WorkflowEngine.ts](../../../../../packages/@dvt/engine/src/core/WorkflowEngine.ts),
  [RunEnrichmentService.ts](../../../../../packages/@dvt/engine/src/services/RunEnrichmentService.ts)

## Current Posture

The read subsystem is real and production-shaped, but it still mixes two read
patterns:

- snapshot-backed summary and detail reads;
- event-timeline reads for operator diagnostics.

The current API shape keeps canonical status and optional enrichment inside one
use case:

- `GetRunStatusUseCase` calls `engine.getRunStatus(...)` by default;
- the same use case switches to
  `runEnrichmentService.getRunEnrichment(...)` when `query.enriched = true`;
- the enriched response keeps canonical status at the top level and exposes
  provider diagnostics under `providerView`;
- there is no separate `EnrichRunStatusUseCase` in the current code.

The documentation rule is to explain those two paths as one subsystem while
keeping the source of truth explicit at each step and avoiding target-state
interactors on active/current pages.

The contract reset under `AR-A12-B` is now reflected in the active boundary:
`CanonicalRunStatus`, `RunStatusEnrichment`, and `ProviderRunStatusView` are
explicit models. `AR-A12-C` remains the cleanup slice for remaining downstream
consumers and naming convergence, not the introduction of the split itself.

## Related Pages

- [System Architecture](../../index.md)
- [Subsystem Architecture](../index.md)
- [DVT Component Map](../../../component-map.md)
- [UI / Visualization Domain](../../../domain-ui.md)
- [API / Entry Domain](../../../domain-api.md)
