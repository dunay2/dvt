---
title: Canvas Node Workbench Hardening Plan
status: Active
owner: Frontend / Product / Architecture
last_reviewed: 2026-08-08
planning_type: mandatory
issue: 2262
---

# Canvas Node Workbench Hardening Plan

## Goal

Harden the existing Canvas / Graph Editor / Node Workbench without creating a second editor, state store, command rail, localization owner, or connection model.

Principle: **less mechanism, no capability loss**.

This is the bounded W4 implementation child #2262 under #2195. Product acceptance remains #2255. Connection/resource-binding semantics remain owned by #2256 and are outside this slice. The later #2258 product-truth integration is the convergence baseline for this PR.

Baseline: `main@32cfaf6d31fa5ca789bdb390def95d27f5d71f59`.

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md`
- GitHub #2195, #2255, #2262

## Current authority model

The repository already has the required owners:

- `CanvasNodeContextMenuModel` expresses the actions that are actually visible in the node context menu;
- `CanvasNodeShell` owns node-shell gestures and receives only already-enabled code/Workbench callbacks;
- `onInspectNode` and `onOpenNodeCode` are the existing Workbench/code intents;
- Graph Draft DVT/dbt authoring persists through `CanvasDraftSession` / CAS;
- file-backed dbt SQL/YAML remain project-file authoritative;
- execution selection is explicit and independent from ordinary React Flow visual selection;
- `CanvasViewCopy` plus the Canvas/node-presentation copy adapters own EN/ES presentation copy.

Therefore this hardening converges entry points onto those owners instead of creating alternatives.

## Integration of PR #2261

PR #2261 (`hardening/canvas-workbench-ux`) overlapped this slice and contained stronger local decisions. They are absorbed into #2266 rather than keeping parallel implementations:

1. **Double-click ownership moves to `CanvasNodeShell`.** It prefers the already-gated existing code callback, otherwise falls back to the already-gated Workbench callback. Missing callbacks fail closed and execution-selection actions are never double-click targets.
2. **Workbench help reuses canonical Canvas copy.** The temporary `canvasCopy.nodeWorkbench.ts` owner is removed. The header uses `inspectorEditablePropertiesTitle` / `inspectorEditablePropertiesDescription`, while preserving existing localized close copy.
3. **The focused double-click and stronger header interaction tests are retained.** The duplicate #2261 implementation plan is not copied; this document remains the canonical plan for #2266.

## Convergence with #2258

`main@9b103e8585852fc72cda8b449205642cbfec42f3` removes the repeated Code action from the node context menu and makes source/code availability fail closed. This later product decision supersedes the original #2266 assumption that the context-menu action model could also carry Code for double-click resolution.

The converged interaction keeps one visible Code action in the selected-node floating toolbar. `CanvasNodeShell` receives the same authoritatively gated code callback without projecting a hidden or repeated context-menu action. The explicit context-menu Workbench action remains available for general inspection. This preserves one command owner and removes duplicate presentation semantics.

## Selected behavior

- Double-click is code-first only when the existing source-aware code callback is available.
- If Code is unavailable but the Workbench callback is available, double-click opens the existing general Workbench.
- Explicit context-menu `Open workbench` remains the passive/general inspection path.
- The floating-toolbar Code control remains the only visible node Code action; double-click reuses its existing command callback without adding a menu item.
- Ordinary node click remains presentation-local and may open the floating toolbar; it does not mutate execution selection.
- Only the explicit execution-selection command mutates execution intent.
- Workbench `?` and `X` are separate right-side controls outside the drag handle.
- Workbench help is contextual; permanent explanatory header prose is not added.
- DVT selectable transform columns retain the **input** role meaning. The UI composes the existing Columns label with the canonical node-presentation role vocabulary, yielding `Columns (Input)` / `Columnas (Entrada)` rather than generic `Columns` or the different concept `Origin`.
- No connection-domain change is made.

## Authoring authority matrix

| Property / surface                                                  | Authority                                                   | Posture                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Graph Draft name/tags/description                                   | `WorkspaceGraphAuthoringDraft` through `CanvasDraftSession` | editable when policy admits         |
| DVT source database/schema/table/alias                              | Graph Draft DVT authoring value object                      | editable                            |
| DVT transform SQL + selected input columns                          | Graph Draft DVT authoring value object                      | editable                            |
| DVT sink database/schema/table/materialization/write mode/partition | Graph Draft DVT authoring value object                      | editable                            |
| dbt SQL project file                                                | revisioned workspace project file                           | editable through existing Code rail |
| supported dbt YAML description                                      | project YAML                                                | editable through existing YAML rail |
| dbt artifact / analysis facts                                       | derived projection                                          | read-only / truthful unavailable    |
| `NodePropertiesReadModel`                                           | passive query model                                         | read-only                           |
| `CanvasInspectorNodeDraft`                                          | transient UI DTO                                            | never persistence authority         |

## Reduction performed

- Removed application-level React Flow click / visual-selection callbacks that intentionally owned no behavior.
- Removed shell/controller forwarding used only by those no-op callbacks.
- Removed unconsumed Inspector `modelerActions` projection after consumer audit.
- Removed the temporary Workbench-specific localization file after #2261 proved existing Canvas copy already owns that message.
- Removed dbt-specific double-click branching after centralizing gesture policy in `CanvasNodeShell`.
- Kept Code out of the node context menu after #2258 removed the repeated visible action; no hidden menu action is used to drive double-click.
- Reused the existing node-presentation role copy for DVT input semantics instead of introducing another copy family.
- Kept explicit execution selection, Graph Draft CAS persistence, project-file/YAML persistence, local floating-toolbar click behavior, search/filter/drag/zoom/context menus, and existing plugin/action models.

## QA findings already incorporated

Remote CI/review caught real defects during this slice and they were fixed without weakening gates:

- stale test/harness consumers of the removed no-op callback seam;
- an accidental stale `CanvasContextMenuView` call signature;
- an over-broad raw-source localization assertion matching `selectedColumns`;
- loss of the `Input columns` semantic when copy was reduced to generic `Columns`;
- the follow-up distinction between `Origin` and the actual `Input` role, resolved through canonical node-presentation role copy;
- the temporary duplicate Workbench copy owner;
- generated Repository Map drift after Web source/test counts changed;
- #2261's original `CanvasNodeShell` double-click fixture, which needed an enabled Inspect action in its context model;
- the mechanization command spelling, which must not include a standalone extra `--`.
- the #2258 integration conflict between source-aware Code availability and the older hidden context-menu Code projection; the converged callback posture preserves both decisions.

## Regression baseline

The slice must preserve:

- contextual Workbench open/close/move;
- explicit Workbench command for passive metadata;
- explicit execution selection and Preview/Run semantics;
- Graph Draft source/model/sink validation and CAS persistence;
- file-backed dbt SQL and supported YAML authority;
- derived file-backed facts remaining read-only;
- route-local layout persistence;
- Canvas graph search/filter/drag/zoom/context menus;
- EN/ES semantics and keyboard-focusable critical controls.

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
  - As a Canvas author, I double-click a node and reach the enabled existing code action or a truthful Workbench fallback.
  - As a Canvas author, I use the explicit Workbench command to inspect or edit only properties owned by the active authority.
  - As a keyboard or Spanish/English user, I can understand, get contextual help for, and close the Workbench without dead or clipped controls.
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
  - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
  - apps/web/src/app/components/canvas/CanvasNodeShell.doubleClick.test.ts
  - apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx
  - apps/web/src/app/components/canvas/CanvasNodeShell.tsx
  - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
  - apps/web/src/app/views/Canvas.test.controller.defaults.ts
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.header.test.tsx
  - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx
  - apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx
  - apps/web/src/app/views/canvas/CanvasShell.testHarness.tsx
  - apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx
  - apps/web/src/app/views/canvas/CanvasViewport.tsx
  - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
  - apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx
  - apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx
  - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts
  - apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts
  - apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - apps/web/src/app/views/canvas/canvasShell.types.ts
  - apps/web/src/app/views/canvas/canvasShellBuilder.types.ts
  - apps/web/src/app/views/canvas/canvasShellGraphCommandsBuilder.ts
  - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts
  - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts
  - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
  - apps/web/src/app/views/canvas/useCanvasGraphHandlers.selection.test.tsx
  - apps/web/src/app/views/canvas/useCanvasGraphHandlers.types.ts
  - apps/web/src/app/views/canvas/useCanvasSelectionHandlers.ts
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
    owner: Node Workbench presentation
  - name: NodePropertiesReadModel
    type: read model
    owner: passive node properties
  - name: CanvasNodeContextMenuModel
    type: read/action model
    owner: Canvas node interaction presentation
fowlerSignals:
  - duplicate semantics across Workbench/code entry points
  - dbt-specific gesture branching despite a generic node action model
  - dead application selection callbacks
  - unconsumed Inspector command projection
  - duplicate presentation copy ownership
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
  - id: canonical-code-first-node-double-click
    redTest: apps/web/src/app/components/canvas/CanvasNodeShell.doubleClick.test.ts
    expectedFailure: The base shell does not resolve double-click from the enabled canonical code and Workbench callbacks.
    patchSurfaces:
      - apps/web/src/app/components/canvas/CanvasNodeShell.tsx
      - apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx
      - apps/web/src/app/components/canvas/DbtNodeComponent.tsx
    greenTest: apps/web/src/app/components/canvas/CanvasNodeShell.doubleClick.test.ts
  - id: workbench-professional-help-close
    redTest: apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.header.test.tsx
    expectedFailure: Help/close are not proven as separate right-side actions outside the drag handle using canonical localized copy.
    patchSurfaces:
      - apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx
    greenTest: apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.header.test.tsx
  - id: selection-seam-reduction
    redTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
    expectedFailure: Application-level React Flow click/selection callbacks and Inspector modeler actions remain despite no product behavior or consumer.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasSelectionHandlers.ts
      - apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts
      - apps/web/src/app/views/canvas/CanvasViewport.tsx
      - apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx
      - apps/web/src/app/views/canvas/canvasControllerViewModel.ts
      - apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts
      - apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts
      - apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx
    greenTest: apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts
  - id: dvt-localized-input-semantics
    redTest: apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx
    expectedFailure: Generic localized Columns copy loses the fact that the selectable columns are transform inputs.
    patchSurfaces:
      - apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx
      - apps/web/src/app/views/canvas/canvasNodePresentationCopy.ts
    greenTest: apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx
  - id: live-authority-proof
    redTest: existing live flows encoded double-click as generic inspection instead of code-first intent.
    expectedFailure: Browser journeys do not distinguish explicit Workbench inspection from double-click Code while preserving authoritative persistence.
    patchSurfaces:
      - apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts
      - apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts
    greenTest: existing live protected-runtime flows with code-first double-click and explicit Workbench command
symbols:
  - { name: resolveCanvasNodeDoubleClickAction, path: apps/web/src/app/components/canvas/CanvasNodeShell.tsx, dddOwner: Canvas node interaction presentation, cqRails: [InspectCanvasNode], fowlerSignals: [dbt-specific gesture branching and repeated visible Code actions], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/components/canvas/CanvasNodeShell.doubleClick.test.ts, apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx], cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts }
  - { name: CanvasNodeWorkbenchPanel, path: apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx, dddOwner: Node Workbench presentation, cqRails: [InspectCanvasNode], fowlerSignals: [presentation and localization drift], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.header.test.tsx], cypressCoverage: apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts }
  - { name: DvtSqlTransformAuthoringSection, path: apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx, dddOwner: DVT transform authoring presentation, cqRails: [ConfigureCanvasDvtNode], fowlerSignals: [presentation and localization drift], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx, apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
  - { name: useCanvasSelectionHandlers, path: apps/web/src/app/views/canvas/useCanvasSelectionHandlers.ts, dddOwner: Canvas interaction presentation, cqRails: [SelectCanvasExecutionNode], fowlerSignals: [dead application selection callbacks], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
  - { name: CanvasInspectorAuthoringContract, path: apps/web/src/app/views/canvas/canvasInspectorAuthoring.types.ts, dddOwner: Node Workbench authoring contract, cqRails: [ConfigureCanvasDvtNode, ConfigureCanvasDbtNode], fowlerSignals: [unconsumed Inspector command projection], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
  - { name: buildCanvasShellPanels, path: apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts, dddOwner: Canvas shell composition, cqRails: [InspectCanvasNode], fowlerSignals: [unconsumed Inspector command projection], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
  - { name: buildCanvasShellGraphCommands, path: apps/web/src/app/views/canvas/canvasShellGraphCommandsBuilder.ts, dddOwner: Canvas shell composition, cqRails: [InspectCanvasNode], fowlerSignals: [dead application selection callbacks], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
  - { name: buildCanvasShellProps, path: apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx, dddOwner: Canvas route composition, cqRails: [InspectCanvasNode], fowlerSignals: [dead application selection callbacks], architectureGuard: pnpm docs:feature-mechanization:implementation --feature W4-CANVAS-NODE-WORKBENCH-HARDENING-20260808, unitTests: [apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts], cypressCoverage: apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts }
```

## Completion boundary

PR #2266 may be considered implementation-review-ready only when the exact-head mechanization, Web type/lint/unit gates, PR Quality, changed-slice/full required CI, and focused QA are green.

That still does **not** close #2255. Real product/browser UAT and explicit product-owner acceptance remain mandatory. The PR stays open and unmerged for owner review.
