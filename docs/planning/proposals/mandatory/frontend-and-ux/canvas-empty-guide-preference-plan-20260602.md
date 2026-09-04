---
title: Canvas empty guide preference plan
status: Superseded
date: 2026-06-02
last_reviewed: 2026-09-04
owners:
  - apps/web
planning_type: proposal
lane: E
---

# Canvas Empty Guide Preference Plan

## Supersession Decision — GH-2896

The empty-guide card and the preference introduced by this plan are retired by
[#2896](https://github.com/dunay2/dvt/issues/2896). Direct Canvas authoring is
now available from the governed toolbar and contextual graph commands, so the
card duplicates the work surface and the preference exists only to control
obsolete presentation.

The retirement removes the card, its persisted preference, settings control,
runtime copy, pass-through wiring, and topology tests. It does not change
`CreateCanvasAuthoringNode`, graph admission, draft persistence, or the
first-Canvas document creation flow.

## Think-First Analysis

Problem summary: an empty created Canvas currently shows the first-node guide
every time the route reaches typed-empty state. Users need an explicit checked
preference on that guide so they can opt out, and they need a configuration menu
path to re-enable it later.

Root cause: the guide is rendered from the typed-empty route posture, while the
existing Canvas viewport preferences only govern grid, color, and snap. The UI
therefore has no governed presentation preference for empty-guide visibility.

Constraints and invariants:

- Reuse the existing `ConfigureCanvasViewportPreferences` rail because the
  planning DB creation-intent preflight returned `reuse-existing-rail`.
- The preference is route-local presentation state. It must not write protected
  graph drafts or create a backend settings API.
- Hiding the guide must not disable node creation, toolbar Insert/Add, draft
  loading, or graph gestures.
- Configuration must remain grouped in a menu with related Canvas presentation
  settings.

Selected option: extend `CanvasViewportPreferences` with empty-guide visibility,
persist it in `uiLayoutStore`, render the checked control inside the guide, and
expose the same control inside the Canvas settings menu.

Rejected alternatives:

- New command rail. Rejected by DB-first preflight because viewport preferences
  already own this local presentation concern.
- Backend or draft persistence. Rejected because guide visibility is not graph
  truth and must not pollute `SaveWorkspaceGraphDraft`.
- A one-off component state flag. Rejected because it would reset per route
  render and would not satisfy "do not show again unless configuration changes."

## Fowler Matrix

| Scenario                                           | Opportunity         | Fowler pattern                                  | DDD owner                   | Command/query rail                   | Implementation surfaces                                             | Unit or package test                                                                                    | Architecture test                              | User-flow test                      | Out of scope        |
| -------------------------------------------------- | ------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------- | ------------------- |
| User hides empty Canvas guide from the guide card. | Hidden authority    | Value Object plus Intention-Revealing Interface | `CanvasViewportPreferences` | `ConfigureCanvasViewportPreferences` | `uiLayoutStore`, Canvas center surface, Canvas empty state          | `uiLayoutStore.test.ts`, `CanvasStateViews.test.tsx`, `Canvas.routeStates.first-canvas-policy.test.tsx` | `canvasLayoutPersistence.architecture.test.ts` | `canvas-first-authoring-live.cy.ts` | Backend settings    |
| User re-enables the guide from configuration.      | Duplicate semantics | Menu contribution / Presenter                   | `CanvasViewMenuControls`    | `ConfigureCanvasViewportPreferences` | `CanvasViewMenuControls`, `CanvasToolbar`, shell contribution store | `CanvasToolbar.test.tsx`                                                                                | `CanvasToolbar.architecture.test.tsx`          | `canvas-first-authoring-live.cy.ts` | New top-level route |

```feature-mechanization
version: 1
featureId: CANVAS-EMPTY-GUIDE-PREFERENCE-20260602
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-empty-guide-preference-plan-20260602.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-layout-persistence-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - docs/architecture/components/web/graph/canvas-layout-persistence-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-command-query-rail-inventory.md
  - docs/architecture/components/web/graph/canvas-layout-persistence-component.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts
  - apps/web/src/app/components/shell/ShellMenu.tsx
  - apps/web/src/app/stores/uiLayoutStore.ts
  - apps/web/src/app/stores/uiLayoutStore.test.ts
  - apps/web/src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
  - apps/web/src/app/views/Canvas.test.controller.defaults.ts
  - apps/web/src/app/views/canvas/CanvasCenterSurface.tsx
  - apps/web/src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts
  - apps/web/src/app/views/canvas/CanvasShell.test.tsx
  - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
  - apps/web/src/app/views/canvas/CanvasStateViews.tsx
  - apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
  - apps/web/src/app/views/canvas/canvasCenterSurface.types.ts
  - apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx
  - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
  - apps/web/src/app/views/canvas/canvasCopy.types.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
  - apps/web/src/app/views/canvas/canvasHostCycleState.test.ts
  - apps/web/src/app/views/canvas/canvasLayoutPersistence.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasShell.types.ts
  - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts
  - apps/web/src/app/views/canvas/canvasShellGraphBuilder.ts
  - apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx
  - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
  - apps/web/src/app/views/canvas/useCanvasStoreFacade.ts
  - docs/architecture/components/web/frontend-command-query-rail-inventory.md
  - docs/architecture/components/web/graph/canvas-layout-persistence-component.md
  - docs/architecture/components/web/graph/canvas-layout-persistence-user-stories.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/planning/closeouts/20260602-canvas-empty-guide-preference-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-empty-guide-preference-plan-20260602.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: ConfigureCanvasViewportPreferences
    type: command
    status: deprecated
    dddOwner: CanvasViewportPreferences value object
domainObjects:
  - name: CanvasViewportPreferences
    type: value object
    owner: Canvas viewport presentation
  - name: CanvasViewMenuControls
    type: presenter
    owner: Canvas route presentation
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Primitive obsession
architectureGuards:
  - pnpm --filter @dvt/web test:architecture -- src/app/views/canvas/canvasLayoutPersistence.architecture.test.ts
  - pnpm --filter @dvt/web test:architecture -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-first-authoring-live.cy.ts
completionGate:
  - pnpm docs:feature-mechanization -- --feature CANVAS-EMPTY-GUIDE-PREFERENCE-20260602
  - pnpm --filter @dvt/web test -- src/app/stores/uiLayoutStore.test.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-first-authoring-live.cy.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization:implementation -- --feature CANVAS-EMPTY-GUIDE-PREFERENCE-20260602
  - pnpm verify:prepush
redGreenCycles:
  - id: empty-guide-card-preference
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasStateViews.test.tsx
    expectedFailure: Canvas empty state does not expose a checked guide visibility preference.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasStateViews.tsx
      - apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasStateViews.test.tsx
  - id: empty-guide-persistence-and-menu
    redTest: pnpm --filter @dvt/web test -- src/app/stores/uiLayoutStore.test.ts src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
    expectedFailure: UI layout store and Canvas settings menu do not own empty-guide visibility yet.
    patchSurfaces:
      - apps/web/src/app/stores/uiLayoutStore.ts
      - apps/web/src/app/views/canvas/**
      - apps/web/src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/stores/uiLayoutStore.test.ts src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx
symbols: []
```
