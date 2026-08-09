---
title: Canvas Node Workbench Hardening Plan
status: Active
owner: Frontend / Product / Architecture
last_reviewed: 2026-08-09
planning_type: mandatory
issue: 2277
---

# Canvas Node Workbench Hardening Plan

## Current decision

This document is the current authority for the Canvas node-interaction hardening that began in #2262/#2266 and is corrected by #2277.

Historical #2266 evidence remains in Git and the merged PR. The current product rule supersedes its former multi-surface interaction model.

Baseline for the correction: `main@cf4a568bb45051e18962b4df434d703e10bd76d9`.

Principle: **less mechanism, no capability loss**.

Product acceptance remains #2255. Connection/resource semantics remain owned by #2256/#2257.

## Gesture-to-intent contract

```text
left click node      -> visual selection/focus only
double left click    -> enter node / open Properties
                         Code is preferred when authoritative code exists
Enter on focused node-> accessibility-equivalent node entry
three-dot button (…) -> node operations only
right click node     -> no DVT-specific action
right click canvas   -> existing Add Component / Canvas context
```

The node floating toolbar is retired. An empty toolbar is not retained for hypothetical future work.

Multiple visible gestures or adjacent controls may not expose the same semantic command merely for discoverability. Keyboard Enter is an input-method equivalent for accessibility and routes through the same node-entry gesture; it is not a second product surface. Embedded buttons, inputs and ports retain their own Enter behavior and do not enter Properties.

## One node Properties surface

`CanvasNodeWorkbenchPanel` is the surviving node inspection/edit surface. It is evolved rather than duplicated.

Its sections are capability-driven. Current section families include, where the node actually supports them:

- Code;
- General;
- Input / Columns;
- Output / Sink;
- Tests;
- Connection/resource information;
- plugin-specific sections.

A section does not create a new persistence authority.

| Surface / value | Authority | Posture |
| --- | --- | --- |
| Graph Draft name/tags/description and plugin semantics | `CanvasDraftSession` -> `WorkspaceGraphAuthoringDraft` CAS | editable when policy admits |
| Graph Draft SQL / selected input columns / sink semantics | typed Graph Draft authoring value objects | editable |
| dbt project SQL | revisioned workspace project file | editable through existing Code working-tree rail |
| supported dbt YAML description | project YAML | editable through existing mutation rail |
| dbt artifacts / analysis facts | derived projection | read-only |
| `NodePropertiesReadModel` | passive projection | read-only |
| `CanvasInspectorNodeDraft` | transient UI DTO | never persistence authority |

For file-backed dbt, double-click or Enter first focuses `CanvasNodeWorkbenchPanel` on Code. The existing revisioned Code editor remains the authoritative editor host in this bounded cut and is launched **inside the Code section**. Closing it restores the same focused node Properties context. No toolbar/right-click shortcut is retained to preserve that file authority.

## Node operations

The visible card `…` is the sole visible launcher for contextual node operations.

The surviving operation model is `CanvasNodeModelerActionModel`. It may expose only operations currently backed by a command, such as:

- select/deselect for execution;
- duplicate when graph mutation is supported;
- remove when graph mutation is supported.

It does not expose Code, Workbench, Properties, or section navigation.

The direct play/pause execution-selection control and its producer/model/tokens are retired because they mutate the same execution-selection intent as the ellipsis operation. One semantic command has one visible owner and no dormant compatibility input remains.

Native node right-click is blocked. Empty-Canvas right-click remains owned by the existing Canvas context-menu presenter and continues to expose Add Component / Canvas actions.

## Retained architecture

- `CanvasNodeShell` owns the double-click node-entry boundary, stable shell target and embedded-control safety.
- `activateFocusedCanvasNodeFromKeyboard` maps Enter on the React Flow node wrapper to the same shell node-entry gesture.
- `isCanvasNodeEmbeddedControlTarget` prevents node entry from button/input/port interactions.
- `CanvasNodeWorkbenchPanel` remains the node Properties owner.
- `NodePropertiesTabs` remains the section presentation primitive.
- Graph Draft CAS/autosave remains unchanged.
- file-backed SQL/YAML persistence remains unchanged.
- visual selection, Properties focus and execution selection remain distinct concepts.
- graph-node operational health detail remains because it has a distinct observable intent.
- Canvas empty-space context menu remains because it owns creation/Canvas operations rather than node operations.

## Retired / absorbed

- left-click node floating toolbar presentation;
- floating-toolbar model, token and position/state plumbing;
- floating-toolbar Code/Freeze/More actions;
- direct play/pause execution-selection presentation on the node card;
- `GraphNodeCardPlayAction`, its builder/test and its visual tokens;
- node-native right-click as a DVT action surface;
- `inspect-node` as a visible node-operations entry and its parallel menu builder;
- `open-code | open-workbench` double-click branching;
- tests that protect those displaced surfaces;
- current documentation that treats those surfaces as product authority.

The underlying layout freeze state is not promoted elsewhere by this cut. If a future supported user operation requires Freeze/Unfreeze, it must be introduced through the existing node-operation authority with a distinct product decision, not by restoring the retired toolbar.

## Acceptance invariants

1. Simple node click changes only ordinary React Flow visual focus/selection.
2. Double-click enters one node Properties intent.
3. Enter on a focused React Flow node enters the same Properties intent.
4. Code-capable nodes focus Code first; nodes without code focus their default/general section.
5. Double-click or Enter on an embedded control does not enter Properties.
6. The `…` menu contains operations only.
7. Native right-click on a node does not open a DVT node menu.
8. Right-click on empty Canvas still opens the existing Canvas context menu.
9. No floating node toolbar is rendered or retained as dormant state.
10. No direct play/pause execution-selection control, producer or compatibility input remains.
11. File-backed dbt metadata remains inspectable and SQL remains revision-authoritative.
12. Closing a file-backed Code editor returns to the same focused node Properties context.
13. Execution selection is never mutated by plain visual selection.
14. ES/EN and keyboard accessibility continue to use the existing localization and focus owners.

## Evidence

Primary automated evidence:

- `CanvasNodeShell.test.tsx` — one pointer node-entry gesture, embedded-control protection, native right-click rejection;
- `CanvasViewport.keyboardNodeEntry.test.ts` — Enter opens the same node-entry gesture and embedded controls remain independent;
- `canvasNodeContextMenuModel.test.ts` / `CanvasNodeContextMenuView.test.tsx` — operations-only ellipsis model;
- `GraphNodeCardView.test.tsx` — no direct play/pause execution-selection surface;
- `DbtNodeComponent.architecture.test.ts` — operations-only node-action builder;
- `canvasNodeWorkbenchHardening.architecture.test.ts` — no floating-toolbar/play topology and one Properties entry authority with keyboard equivalent;
- `canvasNodeContextSurfaceModel.test.ts` — only distinct transient health detail survives;
- `canvas-dbt-author-code-run-live.cy.ts` — Graph Draft Properties authoring/code persistence path;
- `dbt-project-file-projection-live.cy.ts` — file-backed Properties -> Code editor -> return to Properties;
- existing Graph Draft, SQL/YAML, execution-selection, localization and accessibility regressions.

#2255 remains the live-product/product-owner acceptance authority. Green component/CI evidence does not by itself close product acceptance.

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
  - As a Canvas author, I double-click a node once to enter its single Properties surface, with Code preferred when available.
  - As a keyboard user, I press Enter on the focused node to enter the same Properties surface without creating another visible command.
  - As a Canvas author, I use the card ellipsis only for node operations and never need a duplicate floating toolbar or node right-click menu.
  - As a Canvas author, I select or deselect execution through the node operations menu rather than a duplicate play/pause control.
  - As a file-backed dbt author, I reach the authoritative Code editor from the Code section and return to the same node Properties context when it closes.
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
  - apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx
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
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.header.test.tsx
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.keyboardNodeEntry.test.ts
  - apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.tsx
  - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
  - apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.test.ts
  - apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts
  - apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
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
fowlerSignals:
  - duplicate node gestures and adjacent action surfaces
  - split Code versus Workbench node-entry semantics
  - duplicate execution-selection presentation
  - dead application selection callbacks
  - displaced floating-toolbar state and tests
  - presentation and localization drift
architectureGuards:
  - pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts
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
    expectedFailure: The merged interaction exposes separate Code and Workbench double-click intents, no keyboard-equivalent node entry, and native node right-click actions.
    patchSurfaces:
      - apps/web/src/app/components/canvas/CanvasNodeShell.tsx
      - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
      - apps/web/src/app/views/canvas/CanvasViewport.keyboardNodeEntry.test.ts
    greenTest: apps/web/src/app/views/canvas/CanvasViewport.keyboardNodeEntry.test.ts
  - id: operations-only-node-menu
    redTest: apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
    expectedFailure: The previous node menu still exposes Workbench inspection and parallel execution-selection presentation.
    patchSurfaces:
      - apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts
      - apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx
      - apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx
      - apps/web/src/app/plugins/graph/GraphNodeCardView.tsx
      - apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx
      - apps/web/src/app/plugins/graph/graphNodeCardActions.ts
      - apps/web/src/app/plugins/graph/graphVisualTokens.ts
    greenTest: apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts
  - id: retire-floating-toolbar
    redTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
    expectedFailure: Left-click still projects a second floating Code/Freeze/More surface.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasViewport.tsx
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
      - apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts
    greenTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - id: file-backed-properties-code-return
    redTest: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    expectedFailure: Double-click bypasses Properties and opens a separate file Code surface; metadata inspection requires another gesture.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx
      - apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
    greenTest: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
```

## Completion rule

This implementation cut is complete when the exact branch head passes the applicable Web, documentation, governance and repository gates and the PR contains no unresolved review finding. It remains distinct from #2255 live-product/product-owner acceptance.
