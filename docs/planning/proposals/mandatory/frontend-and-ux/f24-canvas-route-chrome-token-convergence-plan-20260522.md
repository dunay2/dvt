---
title: F-24 Canvas Route Chrome Token Convergence Plan
status: Accepted
date: 2026-05-22
last_reviewed: 2026-05-22
owners:
  - apps/web
---

# F-24 Canvas Route Chrome Token Convergence Plan

## Think-First Analysis

Problem summary: F-24 already established the operator-workbench visual-system
direction, but Canvas route chrome still kept local color-family classes in
toolbar, draft status, and tab-strip presentation.

Root cause: Canvas command and draft behavior were decomposed before a small
Canvas-specific route chrome token component existed.

Selected approach: add a narrow `canvasChromeTokens` presentation-token module,
route toolbar, draft-status, workflow-status, and tab-strip chrome through it,
and guard the component boundary with a semantic architecture test.

Out of scope:

- command behavior changes;
- draft persistence changes;
- React Flow graph palette convergence;
- Monaco convergence;
- backend or adapter changes.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                         | Opportunity         | Fowler pattern                      | DDD owner                           | Command/query rail                | Implementation surfaces                                     | Unit or package test                | Architecture test                                 | User-flow test                   | Out of scope    |
| ------------------------------------------------ | ------------------- | ----------------------------------- | ----------------------------------- | --------------------------------- | ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------- | -------------------------------- | --------------- |
| Canvas toolbar uses route-level color literals   | Primitive obsession | Introduce Presentation Token Object | Canvas route chrome token component | none - internal presentation only | `canvasChromeTokens.ts`, Canvas toolbar views               | existing Canvas toolbar tests       | `canvasRoutePosturePriority.architecture.test.ts` | not required; no behavior change | command policy  |
| Draft and workflow badges duplicate tone classes | Duplicate semantics | Consolidate conditional expression  | Canvas route chrome token component | none - internal presentation only | `canvasToolbarViewModel.ts`, `CanvasToolbarDraftStatus.tsx` | Canvas view-model and toolbar tests | `canvasRoutePosturePriority.architecture.test.ts` | not required; no behavior change | draft semantics |
| Docs omit Canvas token ownership                 | Documentation drift | Component guide                     | Web / Canvas docs                   | none - docs only                  | component guide, user stories, closeout                     | markdown/docs gates                 | feature mechanization                             | not required                     | ADR             |

<!-- markdownlint-enable MD060 -->

## Red-Green Plan

1. Add architecture expectations that Canvas route chrome modules import and
   use `canvasChromeTokens`.
2. Add negative assertions that those modules do not contain local color-family
   Tailwind classes.
3. Run the architecture test and observe failure because the token module does
   not exist.
4. Add `canvasChromeTokens.ts` with an owned-concern docblock.
5. Replace route-level hardcodes in Canvas toolbar, draft-status, workflow, and
   tab-strip chrome.
6. Update component docs, stories, closeout, and generated governance surfaces.
7. Validate with focused Canvas tests, changed-suite routing, typecheck, docs
   gates, feature mechanization, governance refresh, and prepush.

ADR decision: no new ADR is required. This slice implements the existing F-24
visual-system and token-convergence governance for Canvas route chrome.

```feature-mechanization
version: 1
featureId: F24-CANVAS-ROUTE-CHROME-TOKEN-CONVERGENCE-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f24-canvas-route-chrome-token-convergence-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-route-chrome-token-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-route-chrome-token-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/iconography-and-design-tokens-contract.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.templates.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/CanvasToolbarDraftStatus.tsx
  - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
  - apps/web/src/app/views/canvas/canvasChromeTokens.ts
  - apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasToolbarViewModel.ts
  - docs/architecture/components/web/graph/canvas-route-chrome-token-component.md
  - docs/architecture/components/web/graph/canvas-route-chrome-token-user-stories.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f24-canvas-route-chrome-token-convergence-plan-20260522.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: CanvasRouteChromeVisualTokenQuery
    type: query
    dddOwner: Canvas route chrome token component
domainObjects:
  - name: canvasChromeTokens
    type: presentation token object
    owner: apps/web
fowlerSignals:
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
cypressFlows:
  - N/A - visual token convergence only; no user flow behavior changes.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
  - pnpm --filter @dvt/web test:changed -- --files apps/web/src/app/views/canvas/CanvasToolbar.tsx apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx apps/web/src/app/views/canvas/CanvasToolbarDraftStatus.tsx apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.templates.tsx apps/web/src/app/views/canvas/canvasToolbarViewModel.ts apps/web/src/app/views/canvas/canvasChromeTokens.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F24-CANVAS-ROUTE-CHROME-TOKEN-CONVERGENCE-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f24-canvas-route-chrome-token-boundary
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
    expectedFailure: Canvas route chrome modules contain local visual hardcodes and no token component import.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.templates.tsx
      - apps/web/src/app/views/canvas/CanvasToolbar.tsx
      - apps/web/src/app/views/canvas/CanvasToolbarDraftStatus.tsx
      - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
      - apps/web/src/app/views/canvas/canvasChromeTokens.ts
      - apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
      - apps/web/src/app/views/canvas/canvasToolbarViewModel.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
symbols:
  - name: CanvasChromeTone
    path: apps/web/src/app/views/canvas/canvasChromeTokens.ts
    dddOwner: Canvas route chrome token component
    cqRails: [CanvasRouteChromeVisualTokenQuery]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web typecheck
    cypressCoverage: N/A - type alias only.
    unitTests: [pnpm --filter @dvt/web typecheck]
  - name: canvasChromeClasses
    path: apps/web/src/app/views/canvas/canvasChromeTokens.ts
    dddOwner: Canvas route chrome token component
    cqRails: [CanvasRouteChromeVisualTokenQuery]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts]
  - name: canvasDraftStatusToneClasses
    path: apps/web/src/app/views/canvas/canvasChromeTokens.ts
    dddOwner: Canvas route chrome token component
    cqRails: [CanvasRouteChromeVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
    cypressCoverage: N/A - visual token class API only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts]
  - name: resolveCanvasDraftStatusClassName
    path: apps/web/src/app/views/canvas/canvasChromeTokens.ts
    dddOwner: Canvas route chrome token component
    cqRails: [CanvasRouteChromeVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
    cypressCoverage: N/A - visual token query helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts]
  - name: resolveCanvasWorkflowStatusClassName
    path: apps/web/src/app/views/canvas/canvasChromeTokens.ts
    dddOwner: Canvas route chrome token component
    cqRails: [CanvasRouteChromeVisualTokenQuery]
    fowlerSignals: [Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
    cypressCoverage: N/A - visual token query helper only.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts]
```
