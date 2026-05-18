---
title: F-24 Runs Dense Table Token Convergence Plan
status: Accepted
date: 2026-05-18
last_reviewed: 2026-05-18
owners:
  - apps/web
---

# F-24 Runs Dense Table Token Convergence Plan

## Think-First Analysis

Problem summary: F-16 made Runs operational views denser and more mature, but
the new tables still encode visual color semantics in route-level Tailwind
classes.

Root cause: row, filter, and event semantics were extracted before the visual
token boundary for dense tables existed.

Selected approach: add a narrow route-workbench dense table token component,
route run status and event level tones through it, document the component, and
add an architecture test that rejects route-level visual hardcodes.

Out of scope:

- changing backend run/query rails;
- changing row identity, filters, sorting, or navigation;
- replacing the global design system;
- broad Canvas or Monaco token convergence.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                  | Opportunity         | Fowler pattern                      | DDD owner                               | Command/query rail                | Implementation surfaces                          | Unit or package test             | Architecture test                         | User-flow test                   | Out of scope                 |
| ----------------------------------------- | ------------------- | ----------------------------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------ | -------------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------- |
| Runs field chrome uses `slate-*` literals | Primitive obsession | Introduce Presentation Token Object | Operator workbench visual system        | none - internal presentation only | `routeWorkbenchTableTokens.ts`, Runs table views | existing Runs table render tests | `runsDomainBoundary.architecture.test.ts` | not required; no behavior change | global token rewrite         |
| Run status and event level colors drift   | Duplicate semantics | Consolidate conditional expression  | Runs dense table visual token component | none - internal presentation only | `runStatesModel.ts`, `RunEventTimelineTable.tsx` | existing Runs table render tests | `runsDomainBoundary.architecture.test.ts` | not required; no behavior change | backend status model changes |
| Docs omit visual-token ownership          | Documentation drift | Component guide                     | Web / Runs docs                         | none - docs only                  | component guide, user stories, buzon analysis    | markdown/docs gates              | `runsDomainBoundary.architecture.test.ts` | not required                     | ADR                          |

<!-- markdownlint-enable MD060 -->

## Red-Green Plan

1. Add architecture expectations that Runs dense table modules import and use
   `routeWorkbenchTableTokens`.
2. Add negative assertions that dense table view modules do not contain raw
   `slate-*`, `bg-red-*`, `bg-yellow-*`, `bg-green-*`, or `bg-blue-*` classes.
3. Run the architecture test and observe failure from the current route-level
   hardcodes.
4. Add `routeWorkbenchTableTokens.ts` with an owned-concern docblock.
5. Replace route-level hardcodes in Runs dense tables and status tone helpers.
6. Update docs and generated indexes.
7. Validate with focused architecture tests, changed-suite routing, docs gates,
   typecheck, and prepush.

ADR decision: no new ADR is required. The slice implements the existing F-24
visual-system and token-convergence governance.

```feature-mechanization
version: 1
featureId: F24-RUNS-DENSE-TABLE-TOKEN-CONVERGENCE-20260518
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-runs-dense-table-token-convergence-plan-20260518.md
componentGuides:
  - docs/architecture/components/web/runs/runs-dense-table-visual-tokens-component.md
userStories:
  - docs/architecture/components/web/runs/runs-dense-table-visual-tokens-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
  - apps/web/src/app/views/runs/RunOperationalTable.tsx
  - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
  - apps/web/src/app/views/runs/runStatesModel.ts
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - buzon/20260518-f24-fowler-runs-dense-table-token-convergence-analysis.md
  - docs/architecture/components/web/runs/dense-operational-tables-component.md
  - docs/architecture/components/web/runs/runs-dense-table-visual-tokens-component.md
  - docs/architecture/components/web/runs/runs-dense-table-visual-tokens-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f24-runs-dense-table-token-convergence-plan-20260518.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: RunsDenseTableVisualTokenQuery
    type: query
    dddOwner: Operator workbench visual system
domainObjects:
  - name: routeWorkbenchTableTokens
    type: presentation token object
    owner: apps/web
fowlerSignals:
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
cypressFlows:
  - N/A - visual token convergence only; no user flow behavior changes.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
  - pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/runs/RunOperationalTable.tsx apps/web/src/app/views/runs/RunEventTimelineTable.tsx apps/web/src/app/views/runs/runStatesModel.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-runs-dense-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    expectedFailure: Runs dense table views contain route-level visual hardcodes and no token component import.
    patchSurfaces:
      - apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
      - apps/web/src/app/views/runs/RunOperationalTable.tsx
      - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
      - apps/web/src/app/views/runs/runStatesModel.ts
      - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
symbols:
  - name: routeWorkbenchDenseTableClasses
    path: apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
    dddOwner: Operator workbench visual system
    cqRails: [RunsDenseTableVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts]
  - name: routeWorkbenchStatusToneClasses
    path: apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
    dddOwner: Operator workbench visual system
    cqRails: [RunsDenseTableVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts]
  - name: RouteWorkbenchStatusTone
    path: apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
    dddOwner: Operator workbench visual system
    cqRails: [RunsDenseTableVisualTokenQuery]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web typecheck
    cypressCoverage: N/A - type alias only.
    unitTests: [pnpm --filter @dvt/web typecheck]
  - name: getRouteWorkbenchStatusToneClassName
    path: apps/web/src/app/components/workbench/routeWorkbenchTableTokens.ts
    dddOwner: Operator workbench visual system
    cqRails: [RunsDenseTableVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts
    cypressCoverage: N/A - visual token query helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts]
```
