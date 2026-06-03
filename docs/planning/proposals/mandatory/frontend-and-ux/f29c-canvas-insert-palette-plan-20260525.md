---
title: F-29-C Canvas Insert Palette Plan
status: Accepted
date: 2026-05-25
owners:
  - apps/web
task_id: F-29-C
planning_type: mandatory-proposal
---

# F-29-C Canvas Insert Palette Plan

## Think-First Analysis

Canvas already had governed node-creation commands and typed node-kind
registries, but the user-facing Add/Insert experience still exposed direct
node buttons in empty-canvas posture and had no active-canvas Insert affordance.
That left the product with a usability gap: users could create a first node in
some states, but could not discover a consistent, keyboard-operable insertion
flow without reading implementation details.

Root cause: the node-creation command was correctly owned by Canvas authoring,
while the presentation affordance was split between empty-state local buttons
and the absence of an active-canvas command. This is a Presentation Model and
Application Controller fit issue, not a new persistence or backend contract.

2026-06-03 overlay hardening addendum: the active-canvas `Insert` palette was
rendered as an absolutely positioned child of the canvas chrome. The chrome owns
horizontal overflow for tabs and toolbar compression, so any child menu extending
below that boundary could be clipped or visually covered by the graph surface.
The root cause is presentation-layer boundary drift: the toolbar hosted both the
command trigger and the transient overlay mechanics. Mature workbench systems
keep menu/popover surfaces in a portalized floating layer so scroll and overflow
containers cannot define overlay visibility.

Selected direction: add one on-demand Canvas node palette that consumes the
active workbench node-kind registry and dispatches the existing
`CreateCanvasNode` command through `onCreateAuthoringNode`. Use it from both
empty-canvas and active-canvas chrome, and prove that no second permanent
navigation rail is introduced.

2026-06-03 selected hardening direction: keep the existing
`CanvasAddNodePalette` presentation model and render its transient menu through
the shared UI `Popover` primitive. This reuses the repo-wide portal pattern used
by `DropdownMenu`, `Select`, and `Dialog` instead of adding a local z-index
patch. The command rail remains unchanged.

Rejected directions:

- permanent left or side node palette, because Canvas Stage 1 explicitly
  rejects a second fixed navigation rail;
- route-local hard-coded node catalog, because node kinds belong to the active
  workbench capability registry;
- new backend rail, because this slice does not change draft authority or
  persistence semantics.
- increasing `z-index` inside the toolbar, because it leaves the menu under an
  overflow-owning ancestor and repeats the same class of clipping bug.

## Command And Query Rails

No new rail is introduced.

| Product behavior                                | Rail                  | Type    | DDD owner                    | Scope and authorization                                                        |
| ----------------------------------------------- | --------------------- | ------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Resolve node kinds available to the active kind | `ListNodeKindCatalog` | query   | `NodeKindCatalogReadModel`   | Active Canvas kind and workspace capability registry only.                     |
| Create a node from the selected kind            | `CreateCanvasNode`    | command | `CanvasAuthoringGraph`       | Existing writable Canvas draft posture; disabled when mutation is unavailable. |
| Verify no permanent node rail was introduced    | `VerifyCanvasUiRail`  | query   | `CanvasWorkbenchVisualProof` | Browser/presentation verification only; no product write authority.            |

## Fowler Opportunity Matrix

| Scenario                                                  | Opportunity          | Fowler pattern                           | DDD owner                    | Implementation surfaces                                                                                                                                | Tests                                                                                                                                                                                                                                       | Out of scope                            |
| --------------------------------------------------------- | -------------------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Empty and active Canvas need one discoverable Insert path | Shotgun presentation | Presentation Model + Application Control | `CanvasInsertPalette`        | `CanvasAddNodePalette.tsx`, `CanvasStateViews.tsx`, `CanvasToolbar.tsx`, `CanvasToolbarPrimaryControls.tsx`, `CanvasShellMainPanel.tsx`, copy catalogs | `CanvasStateViews.test.tsx`, `CanvasToolbar.test.tsx`                                                                                                                                                                                       | pinned permanent palette                |
| Users need keyboard and search before insertion           | Hidden UX semantics  | Semantic fitness function                | `CanvasNodeKindPaletteState` | `CanvasAddNodePalette.tsx`                                                                                                                             | `CanvasStateViews.test.tsx`                                                                                                                                                                                                                 | full command palette                    |
| Toolbar overflow must not clip transient menus            | Boundary drift       | Portalized Presentation Model            | `CanvasInsertPalette`        | `CanvasAddNodePalette.tsx`, `CanvasToolbar.test.tsx`, `canvas-ready-node-authoring-entrypoint-component.md`                                            | `CanvasToolbar.test.tsx` proves the palette is rendered outside the toolbar root while still dispatching `CreateCanvasNode`.                                                                                                                | replacing all Canvas overlay surfaces   |
| Browser proof must follow the real UI path                | Test-only confidence | Browser user proof                       | `CanvasWorkbenchVisualProof` | `canvas-happy-path-draggable.cy.ts`, `canvas-preview-run-persisted.cy.ts`, `canvas-first-authoring-live.cy.ts`                                         | `pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'`; live spec compiles and stays pending when protected runtime is unavailable | direct API seeding of node creation     |
| F-29 review output must remain mechanized                 | Governance drift     | Mechanized implementation plan           | `FeatureMechanizationGuard`  | `docs/planning/reviews/architecture-and-governance/20260525-f29-canvas-workbench-proposal-disposition-review.md`, this plan, F-29-C closeout           | `pnpm docs:feature-mechanization -- --feature F29C-CANVAS-INSERT-PALETTE-20260525`, `pnpm docs:feature-mechanization:implementation`                                                                                                        | bypassing mechanization for local fixes |

## Validation Plan

- `pnpm docs:feature-mechanization -- --feature F29C-CANVAS-INSERT-PALETTE-20260525`
- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx`
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts`
- `pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web lint`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

```feature-mechanization
version: 1
featureId: F29C-CANVAS-INSERT-PALETTE-20260525
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-shell-component.md
  - docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md
  - docs/architecture/components/web/graph/canvas-ready-node-authoring-entrypoint-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts
  - apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts
  - apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts
  - apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
  - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
  - apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
  - apps/web/src/app/views/canvas/CanvasStateViews.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
  - apps/web/src/app/views/canvas/CanvasToolbar.tsx
  - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
  - apps/web/src/app/views/canvas/canvasCopy.types.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts
  - apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts
  - docs/.manifest.json
  - docs/index.md
  - docs/planning/index.md
  - docs/planning/closeouts/index.md
  - docs/planning/closeouts/20260525-f29c-canvas-insert-palette-closeout.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md
  - docs/architecture/components/web/graph/canvas-ready-node-authoring-entrypoint-component.md
  - docs/planning/reviews/architecture-and-governance/20260525-f29-canvas-workbench-proposal-disposition-review.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: ListNodeKindCatalog
    type: query
    dddOwner: NodeKindCatalogReadModel
  - name: CreateCanvasNode
    type: command
    dddOwner: CanvasAuthoringGraph
  - name: VerifyCanvasUiRail
    type: query
    dddOwner: CanvasWorkbenchVisualProof
domainObjects:
  - name: CanvasInsertPalette
    type: presentation model
    owner: Canvas workbench presentation
  - name: CanvasNodeKindPaletteState
    type: value object
    owner: Canvas workbench presentation
  - name: NodeKindCatalogReadModel
    type: read model
    owner: Workbench capability registry
  - name: CanvasAuthoringGraph
    type: aggregate
    owner: Canvas draft authoring
fowlerSignals:
  - Shotgun presentation
  - Hidden UX semantics
  - Test-only confidence
  - Governance drift
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
completionGate:
  - pnpm docs:feature-mechanization -- --feature F29C-CANVAS-INSERT-PALETTE-20260525
  - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts
  - pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f29c-empty-state-palette
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx
    expectedFailure: Empty Canvas exposes direct permanent node buttons instead of an on-demand searchable palette.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
      - apps/web/src/app/views/canvas/CanvasStateViews.tsx
      - apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx
  - id: f29c-active-canvas-insert
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx
    expectedFailure: Active Canvas toolbar has no Insert affordance wired to the existing authoring command.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasToolbar.tsx
      - apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx
      - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
      - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx
  - id: f29c-insert-palette-floating-layer
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx
    expectedFailure: Active Canvas Insert palette remains a toolbar descendant and can be clipped by canvas chrome overflow.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
      - apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
      - docs/architecture/components/web/graph/canvas-ready-node-authoring-entrypoint-component.md
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx
  - id: f29c-browser-flows-use-palette
    redTest: pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
    expectedFailure: Cypress still clicks direct node buttons that no longer represent the product path.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts
      - apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts
      - apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts
    greenTest: pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
  - id: f29c-mechanization-coverage
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: The F-29 review and new Canvas palette symbols are outside selected mechanization manifests.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md
      - docs/planning/reviews/architecture-and-governance/20260525-f29-canvas-workbench-proposal-disposition-review.md
      - docs/planning/closeouts/20260525-f29c-canvas-insert-palette-closeout.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: CanvasAddNodePalette
    path: apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
    dddOwner: CanvasInsertPalette
    cqRails: [ListNodeKindCatalog, CreateCanvasNode]
    fowlerSignals: [Shotgun presentation, Hidden UX semantics]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: CanvasAddNodePaletteProps
    path: apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
    dddOwner: CanvasInsertPalette
    cqRails: [ListNodeKindCatalog, CreateCanvasNode]
    fowlerSignals: [Shotgun presentation]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx]
  - name: filterNodeKinds
    path: apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx
    dddOwner: CanvasNodeKindPaletteState
    cqRails: [ListNodeKindCatalog]
    fowlerSignals: [Hidden UX semantics]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx]
  - name: nodeKinds
    path: apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
    dddOwner: CanvasInsertPalette presentation test fixture
    cqRails: [ListNodeKindCatalog]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit fixture
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx]
  - name: renderEmptyState
    path: apps/web/src/app/views/canvas/CanvasStateViews.test.tsx
    dddOwner: CanvasInsertPalette presentation test harness
    cqRails: [CreateCanvasNode]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit harness
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx]
  - name: nodeKinds
    path: apps/web/src/app/views/canvas/CanvasToolbar.test.tsx
    dddOwner: CanvasInsertPalette toolbar test fixture
    cqRails: [ListNodeKindCatalog]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit fixture
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasToolbar.test.tsx]
```
