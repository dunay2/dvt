---
title: F-18 Live Log Console Closeout Plan
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
planning_type: proposal
featureId: F18-LIVE-LOG-CONSOLE-CLOSEOUT-20260522
---

# F-18 Live Log Console Closeout Plan

## Objective

Close F-18 by making the App Shell bottom console and Runs event timeline share
one governed live-run-event meaning. The shell console is an xterm-backed
companion for the active run, not a placeholder that claims live logging is
unavailable.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/appshell/app-shell.md`
- `docs/architecture/components/web/runs/run-event-timeline-component.md`

## Command And Query Rail Catalog

| Rail                            | Type  | Owning bounded context | DDD owner                         | Port or adapter surface                        | Scope and authorization                                              | Negative tests                                          |
| ------------------------------- | ----- | ---------------------- | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `GetRunEventTimeline`           | query | Web operator workbench | `RunEventTimelineReadModel`       | `IRunsPort.listRunEvents`                      | Current workspace and selected run only; follows existing web auth.  | Missing run id and empty pages do not fabricate events. |
| `BuildBottomConsoleDrawerModel` | query | Web operator workbench | `BottomConsoleDrawerReadModel`    | Shell presentation model                       | Local shell projection only; no backend mutation or dispatch.        | API idle state must not claim live logging is absent.   |
| `RenderXtermConsoleLines`       | query | Web operator workbench | `LiveRunConsolePresentationModel` | `XtermConsole` terminal presentation component | Read-only terminal view; stdin is disabled and events are formatted. | Console remains read-only and line formatting is owned. |

## Fowler Opportunity Matrix

| Scenario                                                | Opportunity           | Fowler pattern                          | DDD owner                         | Implementation surfaces                                                      | Test evidence                                          |
| ------------------------------------------------------- | --------------------- | --------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Shell console copy contradicted implemented live stream | Documentation drift   | Published Language                      | `BottomConsoleDrawerReadModel`    | `bottomConsoleDrawerModel.ts`, App Shell docs, F-18 closeout                 | `bottomConsoleDrawerModel.test.ts`, `Console.test.tsx` |
| Runs timeline and shell console could drift             | Divergent change      | Shared Kernel with semantic guard       | `RunEventTimelineReadModel`       | `runsDomainBoundary.architecture.test.ts`, Run Event Timeline component docs | `runsDomainBoundary.architecture.test.ts`              |
| Terminal rendering was runtime truth but not documented | Hidden implementation | Component guide + Semantic Fitness Test | `LiveRunConsolePresentationModel` | `XtermConsole.tsx`, App Shell docs, Run Event Timeline docs, closeout        | `runsDomainBoundary.architecture.test.ts`              |

## Red-Green Plan

1. Red: update focused console tests to reject the stale "not available" idle
   copy and require a live-run-event empty state.
2. Green: change the shell console idle model string only.
3. Red: update the Runs architecture guard so docs and code must name the
   xterm-backed shell companion.
4. Green: align App Shell and Run Event Timeline docs with the implemented
   `XtermConsole`/`useConsoleLogStream` runtime truth.
5. Close F-18 planning state and validate the focused tests, typecheck, docs
   sync, feature mechanization, and pre-push gate.

ADR decision: no ADR is required. This slice reconciles frontend presentation
semantics and documentation for existing web behavior; it does not change
backend contracts, persistence, run-event schemas, or compatibility policy.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: F18-LIVE-LOG-CONSOLE-CLOSEOUT-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
owner: Frontend / Architecture
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f18-live-log-console-closeout-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/appshell/app-shell.md
  - docs/architecture/components/web/runs/run-event-timeline-component.md
userStories:
  - docs/architecture/components/web/runs/run-event-timeline-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/appshell/app-shell.md
  - docs/architecture/components/web/runs/run-event-timeline-component.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/Console.test.tsx
  - apps/web/src/app/components/console/XtermConsole.tsx
  - apps/web/src/app/components/console/useConsoleLogStream.ts
  - apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts
  - apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - docs/.manifest.json
  - docs/architecture/components/web/appshell/app-shell.md
  - docs/architecture/components/web/runs/run-event-timeline-component.md
  - docs/planning/closeouts/20260522-f18-live-log-console-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f18-live-log-console-closeout-plan-20260522.md
  - docs/planning/state/agent-lane-e.yaml
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: GetRunEventTimeline
    type: query
    dddOwner: RunEventTimelineReadModel
  - name: BuildBottomConsoleDrawerModel
    type: query
    dddOwner: BottomConsoleDrawerReadModel
  - name: RenderXtermConsoleLines
    type: query
    dddOwner: LiveRunConsolePresentationModel
domainObjects:
  - name: RunEventTimelineReadModel
    type: read model
    owner: apps/web
  - name: BottomConsoleDrawerReadModel
    type: presentation read model
    owner: apps/web
  - name: LiveRunConsolePresentationModel
    type: presentation model
    owner: apps/web
fowlerSignals:
  - Documentation drift
  - Divergent change
  - Hidden implementation
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
cypressFlows:
  - N/A - focused shell console semantics are covered by component and architecture tests
completionGate:
  - pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F18-LIVE-LOG-CONSOLE-CLOSEOUT-20260522
  - pnpm docs:feature-mechanization:implementation -- --feature F18-LIVE-LOG-CONSOLE-CLOSEOUT-20260522
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f18-console-idle-copy
    redTest: pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx
    expectedFailure: Shell console still claims API live logging is unavailable.
    patchSurfaces:
      - apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts
      - apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts
      - apps/web/src/app/components/Console.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx
  - id: f18-xterm-companion-doc-drift
    redTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    expectedFailure: App Shell and Run Event Timeline docs do not name the xterm-backed shell companion.
    patchSurfaces:
      - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
      - docs/architecture/components/web/appshell/app-shell.md
      - docs/architecture/components/web/runs/run-event-timeline-component.md
    greenTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx
symbols:
  - name: API_IDLE_MESSAGE
    path: apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts
    dddOwner: BottomConsoleDrawerReadModel
    cqRails: [BuildBottomConsoleDrawerModel]
    fowlerSignals: [Documentation drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx]
  - name: buildBottomConsoleDrawerModel
    path: apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts
    dddOwner: BottomConsoleDrawerReadModel
    cqRails: [BuildBottomConsoleDrawerModel]
    fowlerSignals: [Presentation Model]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx]
  - name: XtermConsole
    path: apps/web/src/app/components/console/XtermConsole.tsx
    dddOwner: LiveRunConsolePresentationModel
    cqRails: [RenderXtermConsoleLines]
    fowlerSignals: [Hidden implementation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/Console.test.tsx]
  - name: useConsoleLogStream
    path: apps/web/src/app/components/console/useConsoleLogStream.ts
    dddOwner: RunEventTimelineReadModel
    cqRails: [GetRunEventTimeline]
    fowlerSignals: [Shared Kernel]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A
    unitTests: [pnpm --filter @dvt/web test -- src/app/components/Console.test.tsx]
```
