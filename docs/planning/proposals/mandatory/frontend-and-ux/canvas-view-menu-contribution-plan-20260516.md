---
title: Canvas View menu contribution plan
status: Accepted
date: 2026-05-16
last_reviewed: 2026-05-16
owners:
  - apps/web
---

# Canvas View Menu Contribution Plan

## Purpose

Move Canvas visual projection controls out of the primary toolbar and into the
shell `View` menu without introducing backend behavior or a parallel command
rail. The Canvas route owns the contribution state; the shell owns placement.

## Scope

- Keep primary Canvas toolbar actions focused on planning, execution, import,
  export, and route status.
- Move layout, impact, column, cost, grid, grid color, and snap controls into
  the shell `View` menu.
- Add semantic component docs, user stories, and architecture tests for the
  contribution boundary.

```feature-mechanization
version: 1
featureId: CANVAS-VIEW-MENU-CONTRIBUTION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-view-menu-contribution-plan-20260516.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-view-menu-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-view-menu-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/command-query-rail-governance.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md
allowedImplementationSurfaces:
  - apps/web/src/app/components/shell/ShellMenu.tsx
  - apps/web/src/app/views/Canvas.draftRecovery.test.tsx
  - apps/web/src/app/views/Canvas.readOnlyStates.test.tsx
  - apps/web/src/app/views/Canvas.routeStates.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
  - apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
  - apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
  - buzon/20260516-codex-fowler-f15-canvas-view-menu-architecture-analysis.md
  - docs/architecture/components/web/graph/canvas-view-menu-component.md
  - docs/architecture/components/web/graph/canvas-view-menu-user-stories.md
  - docs/architecture/components/web/graph/index.md
  - docs/planning/closeouts/20260516-f15-canvas-view-menu-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-view-menu-contribution-plan-20260516.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: CanvasViewMenuContribution
    type: query
    dddOwner: CanvasViewMenuContribution
domainObjects:
  - name: CanvasViewMenuContribution
    type: route contribution state
    owner: Canvas route presentation
  - name: CanvasViewMenuControls
    type: shell menu presenter
    owner: Canvas route presentation
fowlerSignals:
  - Boundary drift
  - Feature envy
  - Duplicate semantics
  - Semantic encapsulation
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
cypressFlows:
  - N/A - unit and architecture coverage only; Playwright CLI unavailable locally.
completionGate:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/Canvas.routeStates.test.tsx src/app/views/Canvas.readOnlyStates.test.tsx src/app/views/Canvas.draftRecovery.test.tsx
  - pnpm --filter @dvt/web test
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web build
  - pnpm lint
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: canvas-view-menu-contribution
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    expectedFailure: Canvas View-menu contribution store and presenter do not exist before implementation.
    patchSurfaces:
      - apps/web/src/app/components/shell/ShellMenu.tsx
      - apps/web/src/app/views/canvas/**
      - apps/web/src/app/views/Canvas.*.test.tsx
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/Canvas.routeStates.test.tsx src/app/views/Canvas.readOnlyStates.test.tsx src/app/views/Canvas.draftRecovery.test.tsx
symbols:
  - name: CanvasViewMenuContribution
    path: apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionState
    path: apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: useCanvasViewMenuContributionStore
    path: apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionRegistrarProps
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionRegistrar
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuControls
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuControls
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Feature envy, Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: expectCanvasActionsPaused
    path: apps/web/src/app/views/Canvas.draftRecovery.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/Canvas.draftRecovery.test.tsx]
  - name: COMPONENT_GUIDE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: SHELL_MENU_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: TOOLBAR_PRIMARY_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Feature envy]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: VIEW_MENU_CONTROLS_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuControls
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: VIEW_MENU_STORE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [CanvasViewMenuContribution]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    cypressCoverage: N/A - route-menu contribution is covered by unit and architecture tests.
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
```
