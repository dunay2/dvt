---
title: Canvas Node Workbench Hardening Plan
status: Active
owner: Frontend / Product / Architecture
last_reviewed: 2026-08-09
planning_type: mandatory
issue: 2277
---

# Canvas Node Workbench Hardening Plan

## Decision

This plan supersedes the multi-surface node interaction merged by #2266.

```text
left click node       -> visual selection/focus only
double click node     -> enter node / Properties
Enter on focused node -> same node-entry gesture
card Play/Pause       -> retained direct node affordance; not classified as duplicate of ellipsis
card ellipsis (…)     -> node operations only
right click node      -> no DVT-specific action
right click canvas    -> existing Canvas/Add Component context
```

Code-capable nodes enter Properties with Code preferred. Embedded controls keep their own pointer/keyboard behavior.

`CanvasNodeWorkbenchPanel` remains the single node Properties surface. Graph Draft remains CAS-authoritative; dbt project SQL/YAML remains file-authoritative; derived artifact facts remain read-only.

For file-backed dbt, the authoritative revisioned editor is launched from inside the Code section and closing it returns to the same focused node Properties context.

### Product-owner correction — Play/Pause

Play/Pause was incorrectly classified as a duplicate of execution-selection operations during #2278 hardening. That removal was not authorized and is reverted.

Play/Pause remains a distinct visible affordance and must not be retired merely because the current baseline implementation derives it from `onToggleNodeSelection`. That implementation detail is evidence of a possible semantic conflation, not proof that the product intents are identical. Any change to the Play/Pause command semantics belongs to a separately evidenced run/execution-control audit; this W4.2 cut preserves the capability.

## Retain

- `CanvasNodeShell` as node-entry gesture boundary;
- `CanvasNodeWorkbenchPanel` + `NodePropertiesTabs` as Properties surface;
- `CanvasNodeModelerActionModel` as operations-only ellipsis model;
- card Play/Pause affordance, its model, visual tokens and current command wiring until a separate execution-control decision replaces it;
- visual selection separate from execution selection;
- Graph Draft and file-backed persistence authorities;
- distinct operational-health detail;
- empty-Canvas context menu.

## Retire

- node floating toolbar, its model, tokens, state and tests;
- split `open-code | open-workbench` double-click policy;
- native node right-click product menu;
- visible `inspect-node`/Workbench navigation in node operations;
- topology tests that require the retired surfaces.

## Acceptance invariants

1. Plain click never opens Properties and never mutates execution selection.
2. Double-click and Enter enter the same Properties intent.
3. Embedded controls do not trigger node entry.
4. Code-capable nodes prefer Code; other nodes use their default/general section.
5. Ellipsis contains operations only: execution selection, duplicate and remove when supported.
6. Play/Pause remains available when the node-card action model exposes it; this slice does not remove or silently redefine it.
7. Native right-click on a node does not expose DVT node actions.
8. Empty-Canvas right-click still exposes the existing Canvas context.
9. No floating toolbar remains.
10. File-backed Code remains revision-authoritative and returns to the same Properties context on close.
11. ES/EN and accessibility remain owned by the existing localization/focus rails.

## Evidence

- `CanvasNodeShell.test.tsx`
- `CanvasViewport.keyboardNodeEntry.test.ts`
- `canvasNodeContextMenuModel.test.ts`
- `CanvasNodeContextMenuView.test.tsx`
- `GraphNodeCardView.test.tsx`
- `graphNodeCardActions.test.ts`
- `DbtNodeComponent.architecture.test.ts`
- `canvasNodeWorkbenchHardening.architecture.test.ts`
- `canvasNodeContextSurfaceModel.test.ts`
- `canvas-dbt-author-code-run-live.cy.ts`
- `dbt-project-file-projection-live.cy.ts`

#2255 remains the independent live-product/product-owner acceptance gate.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-workbench-hardening-plan-20260808.md
componentGuides:
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
userStories:
  - As a Canvas author, I enter a node through one Properties surface with Code preferred when available.
  - As a keyboard user, I press Enter on the focused node to enter the same Properties surface.
  - As a Canvas author, I use the card ellipsis only for node operations.
  - As a Canvas author, I retain the direct Play/Pause affordance and do not lose it as a side effect of simplifying node navigation.
  - As a file-backed dbt author, I open the authoritative editor from Properties Code and return to the same node context.
governingSources:
  - AGENTS.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
  - apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx
  - apps/web/src/app/components/canvas/CanvasNodeShell.doubleClick.test.ts
  - apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx
  - apps/web/src/app/components/canvas/CanvasNodeShell.tsx
  - apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts
  - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
  - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
  - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts
  - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
  - apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx
  - apps/web/src/app/plugins/graph/GraphNodeCardView.tsx
  - apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx
  - apps/web/src/app/plugins/graph/graphNodeCardActions.test.ts
  - apps/web/src/app/plugins/graph/graphNodeCardActions.ts
  - apps/web/src/app/plugins/graph/graphVisualTokens.ts
  - apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx
  - apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.tsx
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.keyboardNodeEntry.test.ts
  - apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.tsx
  - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
  - apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts
  - apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts
  - apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts
  - apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts
  - apps/web/src/app/views/canvas/canvasNodeFloatingToolbarTokens.ts
  - apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
  - docs/concepts/repository-map.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-workbench-hardening-plan-20260808.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-*/**
  - infra/db/**
  - tools/planning-db/**
commandQueryRails:
  - name: InspectCanvasNode
    type: command
    status: implemented
    dddOwner: Canvas interaction presentation
  - name: ConfigureCanvasDvtNode
    type: command
    status: implemented
    dddOwner: CanvasDraftSession
  - name: ConfigureCanvasDbtNode
    type: command
    status: implemented
    dddOwner: CanvasDraftSession
  - name: SaveWorkspaceGraphDraft
    type: command
    status: implemented
    dddOwner: WorkspaceGraphAuthoringDraft
  - name: SelectCanvasExecutionNode
    type: command
    status: implemented
    dddOwner: Canvas execution-selection intent
domainObjects:
  - name: CanvasDraftSession
    type: aggregate
    owner: Web Canvas authoring
  - name: WorkspaceGraphAuthoringDraft
    type: persisted protocol
    owner: Graph Draft authority
  - name: CanvasInspectorNodeDraft
    type: transient DTO
    owner: Node Properties presentation
  - name: NodePropertiesReadModel
    type: read model
    owner: passive node properties
  - name: CanvasNodeModelerActionModel
    type: operation read model
    owner: Canvas node interaction presentation
symbols:
  - path: apps/web/src/app/components/canvas/CanvasNodeShell.tsx
    name: handleDoubleClick
    kind: function
    exported: false
  - path: apps/web/src/app/components/canvas/CanvasNodeShell.tsx
    name: handleContextMenuCapture
    kind: function
    exported: false
  - path: apps/web/src/app/components/canvas/CanvasNodeShell.tsx
    name: nativeEvent
    kind: const
    exported: false
  - path: apps/web/src/app/components/canvas/DbtNodeComponent.tsx
    name: hasCodeSection
    kind: const
    exported: false
  - path: apps/web/src/app/components/canvas/DbtNodeComponent.tsx
    name: contextMenuModel
    kind: const
    exported: false
  - path: apps/web/src/app/components/canvas/DbtNodeComponent.tsx
    name: handleOpenNode
    kind: function
    exported: false
  - path: apps/web/src/app/plugins/graph/GraphNodeCardView.tsx
    name: contextMenuEvent
    kind: const
    exported: false
  - path: apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
    name: activateFocusedCanvasNodeFromKeyboard
    kind: function
    exported: true
  - path: apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
    name: nodeElement
    kind: const
    exported: false
  - path: apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
    name: shell
    kind: const
    exported: false
  - path: apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
    name: MouseEventConstructor
    kind: const
    exported: false
  - path: apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
    name: openNodeCodeEditor
    kind: function
    exported: false
  - path: apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
    name: node
    kind: const
    exported: false
fowlerSignals:
  - duplicate node gestures and adjacent action surfaces
  - split Code versus Workbench node-entry semantics
  - possible Play/Pause versus execution-selection semantic conflation; preserve the affordance and audit separately rather than deleting it
  - displaced floating-toolbar state and tests
architectureGuards:
  - pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
completionGate:
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm --filter @dvt/web test
  - pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: single-node-properties-entry
    redTest: apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx
    expectedFailure: Previous node entry split Code and Workbench, duplicated node right-click, and lacked keyboard parity.
    greenTest: apps/web/src/app/views/canvas/CanvasViewport.keyboardNodeEntry.test.ts
  - id: operations-only-node-menu
    redTest: apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
    expectedFailure: Previous node menu exposed Workbench navigation alongside node operations.
    greenTest: apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
  - id: retire-floating-toolbar
    redTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
    expectedFailure: Left-click projected a second floating Code/Freeze/More surface.
    greenTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - id: file-backed-properties-code-return
    redTest: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    expectedFailure: Double-click bypassed Properties and metadata inspection required another gesture.
    greenTest: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
```

## Completion rule

The implementation cut is complete only when the exact PR head passes the applicable Web, documentation, governance and repository gates and review has no unresolved finding. This is separate from #2255 product-owner acceptance.

Play/Pause command semantics are not silently redefined by this cut. Their current baseline wiring is preserved while W5/run-control work determines whether the product intent should map to run/start/pause/resume or another explicit execution control.
