---
title: Runs Domain Semantic Encapsulation Plan
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-08
planning_type: proposal
---

# Runs Domain Semantic Encapsulation Plan

This plan governs the corrective closeout of the Runs frontend semantic
encapsulation slice. The work is limited to local `apps/web` runs boundaries:
owned-concern docblocks, executable architecture guards, HTTP error
classification reuse, component documentation, and generated status refreshes.

The correction removes two integration risks from the first draft:

1. Active docs and tests no longer depend on a `buzon/` analysis file as proof.
2. Run status helpers remain in the runs view-model owner instead of a generic
   app-root module.

No backend, contract, engine, adapter, planner, save/export/import, or protected
draft behavior is in scope.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/runs/component-runs.md`
- `docs/architecture/components/web/runs/dvt-runs-frontend-architecture.md`
- `docs/architecture/components/web/runs/user-stories-runs.md`

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: RUNS-SEMANTIC-ENCAPSULATION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/runs-domain-semantic-encapsulation-plan-20260508.md
componentGuides:
  - docs/architecture/components/web/runs/component-runs.md
  - docs/architecture/components/web/runs/dvt-runs-frontend-architecture.md
userStories:
  - docs/architecture/components/web/runs/user-stories-runs.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/runs/component-runs.md
allowedImplementationSurfaces:
  - apps/web/src/app/ports/runs.ts
  - apps/web/src/app/services/api/classifyHttpError.ts
  - apps/web/src/app/services/api/classifyHttpError.test.ts
  - apps/web/src/app/services/runs/runEventPresentationCopy.ts
  - apps/web/src/app/services/runs/runEventPresentationModel.ts
  - apps/web/src/app/services/runs/runEventTimelineModel.ts
  - apps/web/src/app/services/runs/runEventTimelineModel.test.ts
  - apps/web/src/app/services/runs/runWorkspaceFacade.ts
  - apps/web/src/app/services/runs/runsApiDecoders.ts
  - apps/web/src/app/services/runs/runsApiPayloads.ts
  - apps/web/src/app/services/runs/runsApiPayloads.test.ts
  - apps/web/src/app/services/runs/runsApiSnapshotMapper.ts
  - apps/web/src/app/services/runs/runsService.test.ts
  - apps/web/src/app/views/runs/RunDetailStateViews.tsx
  - apps/web/src/app/views/runs/RunListStateView.tsx
  - apps/web/src/app/views/runs/RunStates.tsx
  - apps/web/src/app/views/runs/RunTimelineEventCard.tsx
  - apps/web/src/app/views/runs/RunWorkspaceStateView.tsx
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - apps/web/src/app/views/runs/runStatesCopy.ts
  - apps/web/src/app/views/runs/runStatesModel.ts
  - apps/web/src/app/views/runs/runStatesModel.test.ts
  - apps/web/src/app/views/runs/runWorkbenchStateModel.ts
  - apps/web/src/app/views/runs/useRunWorkspace.ts
  - docs/architecture/components/web/runs/component-runs.md
  - docs/architecture/components/web/runs/dvt-runs-frontend-architecture.md
  - docs/architecture/components/web/runs/run-event-timeline-component.md
  - docs/architecture/components/web/runs/run-event-timeline-user-stories.md
  - docs/architecture/components/web/runs/user-stories-runs.md
  - docs/planning/proposals/mandatory/frontend-and-ux/runs-domain-semantic-encapsulation-plan-20260508.md
  - docs/planning/status/generated-code-state.md
  - docs/planning/status/system-governance-file-fingerprint-baseline.yaml
  - docs/planning/status/system-governance-file-index.files.yaml
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - apps/web/src/app/entrypoints/**
  - specs/**
commandQueryRails:
  - name: StartRun
    type: command
    dddOwner: IRunsPort
  - name: GetRunSnapshot
    type: query
    dddOwner: IRunsPort
  - name: ListRunSummaries
    type: query
    dddOwner: IRunsPort
  - name: ListRunEvents
    type: query
    dddOwner: IRunsPort
  - name: BuildRunsWorkbenchState
    type: query
    dddOwner: RunsWorkbenchState
  - name: BuildRunsDomainBoundaryGuard
    type: query
    dddOwner: RunsDomainBoundaryArchitectureTest
domainObjects:
  - name: RunsWorkbenchState
    type: discriminated-union
    owner: apps/web/src/app/views/runs/runWorkbenchStateModel.ts
  - name: RunWorkspaceViewModel
    type: view-model
    owner: apps/web/src/app/services/runs/runWorkspaceFacade.ts
  - name: RunEventPresentationModel
    type: presentation-model
    owner: apps/web/src/app/services/runs/runEventPresentationModel.ts
  - name: RunCommonSnapshotFields
    type: DTO field group
    owner: apps/web/src/app/ports/runs.ts
  - name: HttpErrorKind
    type: error classification
    owner: apps/web/src/app/services/api/classifyHttpError.ts
fowlerSignals:
  - Owned-concern boundaries are explicit at module entry points.
  - Runs views do not import API adapter implementations directly.
  - Command/query rails remain visible at the port boundary.
  - HTTP errors map to semantic UI kinds before view rendering.
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
cypressFlows:
  - N/A - no browser workflow changed in this semantic encapsulation slice
completionGate:
  - pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts src/app/services/runs/runsApiPayloads.test.ts src/app/services/runs/runsService.test.ts src/app/services/runs/runWorkspaceFacade.test.ts src/app/views/runs/runStatesModel.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: runs-owned-concern-docblocks
    redTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts -t "owned-concern"
    expectedFailure: Runs boundary modules without owned-concern docblocks fail the architecture guard.
    patchSurfaces:
      - apps/web/src/app/services/runs/**
      - apps/web/src/app/views/runs/**
      - apps/web/src/app/ports/runs.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - id: runs-feature-manifest-closeout
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Changed runs surfaces are rejected until this manifest declares files and symbols.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/runs-domain-semantic-encapsulation-plan-20260508.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: RunCommonSnapshotFields
    path: apps/web/src/app/ports/runs.ts
    dddOwner: RunSnapshot
    cqRails:
      - GetRunSnapshot
      - ListRunSummaries
    fowlerSignals:
      - Shared snapshot-summary field group
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - DTO-only frontend boundary
    unitTests:
      - pnpm --filter @dvt/web typecheck
  - name: RunSummaryItem
    path: apps/web/src/app/ports/runs.ts
    dddOwner: RunSummaryItem
    cqRails:
      - ListRunSummaries
    fowlerSignals:
      - Shared snapshot-summary field group
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - DTO-only frontend boundary
    unitTests:
      - pnpm --filter @dvt/web typecheck
  - name: RunSnapshot
    path: apps/web/src/app/ports/runs.ts
    dddOwner: RunSnapshot
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Shared snapshot-summary field group
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - DTO-only frontend boundary
    unitTests:
      - pnpm --filter @dvt/web typecheck
  - name: parseSnapshotStaleness
    path: apps/web/src/app/services/runs/runsApiDecoders.ts
    dddOwner: RunSnapshot
    cqRails:
      - GetRunSnapshot
      - ListRunSummaries
    fowlerSignals:
      - Runtime API decoder boundary
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - API decoder unit path
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runsService.test.ts
  - name: parseMaterializationEvidence
    path: apps/web/src/app/services/runs/runsApiDecoders.ts
    dddOwner: RunSnapshot
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Runtime API decoder boundary
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - API decoder unit path
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runsService.test.ts
  - name: extractEventsPayload
    path: apps/web/src/app/services/runs/runsApiPayloads.ts
    dddOwner: RunEventTimelinePage
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Runtime API payload boundary
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - API payload unit path
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runsApiPayloads.test.ts
  - name: HttpErrorKind
    path: apps/web/src/app/services/api/classifyHttpError.ts
    dddOwner: HttpErrorKind
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Semantic HTTP error classification
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - no browser workflow changed
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts
  - name: classifyHttpError
    path: apps/web/src/app/services/api/classifyHttpError.ts
    dddOwner: HttpErrorKind
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Semantic HTTP error classification
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - no browser workflow changed
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts
  - name: extractHttpStatusCode
    path: apps/web/src/app/services/api/classifyHttpError.ts
    dddOwner: HttpErrorKind
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Semantic HTTP error classification
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - no browser workflow changed
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts
  - name: makeApiError
    path: apps/web/src/app/services/api/classifyHttpError.test.ts
    dddOwner: HttpErrorKindTest
    cqRails:
      - GetRunSnapshot
    fowlerSignals:
      - Semantic HTTP error classification test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts
    cypressCoverage: N/A - unit test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/api/classifyHttpError.test.ts
  - name: createSessionContextMock
    path: apps/web/src/app/services/runs/runsApiPayloads.test.ts
    dddOwner: RunsApiPayloadsTest
    cqRails:
      - ListRunSummaries
      - ListRunEvents
    fowlerSignals:
      - Tenant-scope query construction test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/runs/runsApiPayloads.test.ts
    cypressCoverage: N/A - unit test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runsApiPayloads.test.ts
  - name: TEST_DIR
    path: apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    dddOwner: RunsDomainBoundaryArchitectureTest
    cqRails:
      - BuildRunsDomainBoundaryGuard
    fowlerSignals:
      - Architecture test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - name: APP_ROOT
    path: apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    dddOwner: RunsDomainBoundaryArchitectureTest
    cqRails:
      - BuildRunsDomainBoundaryGuard
    fowlerSignals:
      - Architecture test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - name: readAppSource
    path: apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    dddOwner: RunsDomainBoundaryArchitectureTest
    cqRails:
      - BuildRunsDomainBoundaryGuard
    fowlerSignals:
      - Architecture test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - name: readRepoFile
    path: apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    dddOwner: RunsDomainBoundaryArchitectureTest
    cqRails:
      - BuildRunsDomainBoundaryGuard
    fowlerSignals:
      - Architecture test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - name: hasOwnedConcernDocblock
    path: apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    dddOwner: RunsDomainBoundaryArchitectureTest
    cqRails:
      - BuildRunsDomainBoundaryGuard
    fowlerSignals:
      - Architecture test helper
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - name: RUN_EVENT_LIVE_POLL_INTERVAL_MS
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event stream cadence
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: RunEventTimelineModel
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event stream state
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: compareRunEvents
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event chronology ordering
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: dedupeAndSortRunEvents
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event chronology dedupe
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: deriveNextAfterSeq
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event cursor preservation
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: isRunEventStreamLiveStatus
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared active-status polling policy
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: normalizeRunEventTimelinePage
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event page normalization
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: mergeRunEventTimelinePage
    path: apps/web/src/app/services/runs/runEventTimelineModel.ts
    dddOwner: RunEventTimelineModel
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Shared event page merge
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - pure model
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
  - name: RunTimelineEventCardProps
    path: apps/web/src/app/views/runs/RunTimelineEventCard.tsx
    dddOwner: RunTimelineEventCard
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Structured timeline rendering boundary
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - structured event card
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/RunStates.test.tsx
  - name: RunTimelineEventCard
    path: apps/web/src/app/views/runs/RunTimelineEventCard.tsx
    dddOwner: RunTimelineEventCard
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Structured timeline rendering boundary
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - structured event card
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/views/runs/RunStates.test.tsx
  - name: makeEvent
    path: apps/web/src/app/services/runs/runEventTimelineModel.test.ts
    dddOwner: RunEventTimelineModelTest
    cqRails:
      - ListRunEvents
    fowlerSignals:
      - Event timeline test fixture
    architectureGuard: pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
    cypressCoverage: N/A - unit test helper
    unitTests:
      - pnpm --filter @dvt/web test -- src/app/services/runs/runEventTimelineModel.test.ts
```

## Validation Plan

1. Run focused web tests for the changed runs and API helper scope.
2. Run `pnpm --filter @dvt/web typecheck`.
3. Regenerate code/docs/governance status after structural additions.
4. Run `pnpm docs:feature-mechanization:implementation`.
5. Finish with `pnpm verify:prepush`.
