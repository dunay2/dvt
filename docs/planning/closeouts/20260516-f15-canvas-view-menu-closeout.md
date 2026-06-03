---
slice: f15-canvas-view-menu
date: 2026-05-16
last_reviewed: 2026-05-16
lane: E
task: F-15
author: AI (Codex)
---

# Closeout: F-15 Canvas View Menu

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md`
- `docs/architecture/components/web/graph/canvas-shell-component.md`
- `docs/architecture/components/web/graph/canvas-route-presentation-component.md`
- Planning task `E F-15`

## Fowler Analysis Summary

The canvas toolbar had accumulated visual projection controls alongside
workflow commands. Fowler-style responsibility slicing shows two concerns:
workflow intent belongs in the persistent toolbar, while visual projection and
inspection posture belong in the shell `View` menu. Mature IDE and workbench
systems use the same split to keep high-frequency command surfaces stable and
route-specific visual controls contextual.

The selected pattern is a route contribution into the shell menu. The Canvas
route owns its visual-control state and handlers; the shell owns only the
menu placement. No command/query rail was required because the change is local
presentation state and does not introduce externally observable backend
behavior.

## Changes Made

| File                                                                        | Change                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `buzon/20260516-codex-fowler-f15-canvas-view-menu-architecture-analysis.md` | Added Fowler architecture analysis, anti-patterns, drift, opportunities, and solution rationale.                   |
| `docs/architecture/components/web/graph/canvas-view-menu-component.md`      | Added local component guide with public API, invariants, transitions, consumers, and diagrams.                     |
| `docs/architecture/components/web/graph/canvas-view-menu-user-stories.md`   | Added user stories for the View-menu migration and architecture fitness.                                           |
| `docs/architecture/components/web/graph/index.md`                           | Linked the new component guide and story document.                                                                 |
| `apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts`          | Added owned state boundary for Canvas route contribution to the shell View menu.                                   |
| `apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx`                  | Added View-menu rendering for Canvas visual controls with an owned-concern docblock.                               |
| `apps/web/src/app/components/shell/ShellMenu.tsx`                           | Mounted Canvas-specific View controls in the shell `View` menu.                                                    |
| `apps/web/src/app/views/canvas/CanvasToolbar.tsx`                           | Registered the Canvas View-menu contribution and removed visual projection props from primary toolbar controls.    |
| `apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx`            | Kept the toolbar focused on workflow/status actions.                                                               |
| `apps/web/src/app/views/canvas/CanvasToolbar.test.tsx`                      | Added TDD coverage proving visual controls are no longer primary toolbar actions and View commands are registered. |
| `apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx`         | Added semantic architecture tests for ownership, shell contribution, docs, and diagrams.                           |
| `apps/web/src/app/views/Canvas.routeStates.test.tsx`                        | Updated blocked-state assertions to verify primary actions and View contribution semantics.                        |
| `apps/web/src/app/views/Canvas.readOnlyStates.test.tsx`                     | Updated read-only assertions to verify primary actions and View contribution semantics.                            |
| `apps/web/src/app/views/Canvas.draftRecovery.test.tsx`                      | Updated recovery assertions to verify primary actions and View contribution semantics.                             |
| `docs/planning/closeouts/20260516-f15-canvas-view-menu-closeout.md`         | Recorded closeout evidence for this slice.                                                                         |

## Test Evidence

| Command                                                                                                                                                                                                                                                                  | Result                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx`                                                                                                                                    | Failed first, as expected, before implementation because the View-menu component and contribution store did not exist. |
| `pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/Canvas.routeStates.test.tsx src/app/views/Canvas.readOnlyStates.test.tsx src/app/views/Canvas.draftRecovery.test.tsx` | Passed: 5 files, 39 tests.                                                                                             |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                                                                                                                       | Passed before final doc refresh.                                                                                       |
| `pnpm --filter @dvt/web build`                                                                                                                                                                                                                                           | Passed before final doc refresh.                                                                                       |
| `pnpm exec playwright --version`                                                                                                                                                                                                                                         | Failed: Playwright CLI is not installed in this workspace, so browser screenshot validation could not be run locally.  |

Final refresh and pre-push validation commands are recorded in the assistant
closeout for this task.

## No-Debt And No-Stub Evidence

- No new debt entry was created.
- No TODO, placeholder, fake adapter, fake success path, or unfinished branch
  was introduced.
- No lint, type, test, hook, or quality rule was disabled or relaxed.
- No commit hook was bypassed.
- Pre-existing unrelated local changes under auth/login/internal-alpha files
  were left untouched.

```feature-mechanization
version: 1
featureId: CANVAS-VIEW-MENU-CONTRIBUTION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/closeouts/20260516-f15-canvas-view-menu-closeout.md
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
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: none
    type: presentation-state
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
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation, Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionState
    path: apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: useCanvasViewMenuContributionStore
    path: apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionRegistrarProps
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuContributionRegistrar
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasViewMenuControls
    path: apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx
    dddOwner: CanvasViewMenuControls
    cqRails: [none]
    fowlerSignals: [Feature envy, Duplicate semantics]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: expectCanvasActionsPaused
    path: apps/web/src/app/views/Canvas.draftRecovery.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/Canvas.draftRecovery.test.tsx]
  - name: COMPONENT_GUIDE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: SHELL_MENU_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: TOOLBAR_PRIMARY_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Feature envy]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: VIEW_MENU_CONTROLS_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuControls
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
  - name: VIEW_MENU_STORE_SOURCE
    path: apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    dddOwner: CanvasViewMenuContribution
    cqRails: [none]
    fowlerSignals: [Semantic encapsulation]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx
    unitTests: [pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.architecture.test.tsx]
```
