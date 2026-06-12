---
title: Frontend Component Inventory
status: Active
owner: Web / Architecture
last_reviewed: 2026-06-04
---

# Frontend Component Inventory

## Purpose

This document is the governed source imported into the planning DB for the
frontend component reflection read model. It complements the frontend
mechanical truth inventory and the frontend command/query rail inventory:

- `frontend_mechanical_truth_surfaces` names visible surfaces and their product
  maturity posture.
- `frontend_command_query_rails` names frontend command/query semantics.
- `frontend_components` names the components, files, rails, and evidence that
  build those surfaces.

The query-store rail is `ListFrontendComponentReflection`, exposed through:

```bash
pnpm planning:db:query frontend-components --limit 20
pnpm planning:db:query frontend-component-files --component web.component.canvas.CanvasToolbar
pnpm planning:db:query frontend-component-rails --status gap-needed --limit 20
```

This inventory still reuses `ListFrontendMechanicalTruthSurfaces` and
`ListFrontendCommandQueryRails` as source authority for surface and rail
semantics.

## Governing Sources

- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md`

## Maintenance Rules

- Keep the table headings stable; the planning DB importer depends on them.
- A `current` component must have at least one file and one evidence row.
- A component surface link must reference an existing frontend mechanical truth
  surface.
- A component rail must reuse a frontend command/query rail name where the rail
  is externally observable.
- Do not add symbol, port, data-contract, or dependency rows here until the AST
  validation slice is implemented.

## Frontend Components

| Component ID                                  | Component name        | Component kind   | Component status | Reuse decision | Frontend owner           | Responsibility                                                                            | Package    | Route scope                                                                                        | Plugin scope                                     | Capability gaps                                                     | Evidence                                                                             |
| --------------------------------------------- | --------------------- | ---------------- | ---------------- | -------------- | ------------------------ | ----------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `web.component.shell.AppShellFrame`           | AppShellFrame         | shell-frame      | current          | reuse          | Authenticated shell root | Render the persistent application shell frame around route workbenches.                   | `@dvt/web` | `/`                                                                                                | dbt; dvt-warehouse-source; dvt; monitoring; cost | richer console product semantics                                    | `AppShellFrame.test.tsx`; `frontend-mechanical-truth-inventory.md`                   |
| `web.component.shell.ShellTopBar`             | ShellTopBar           | shell-bar        | current          | harden         | Authenticated shell root | Render compact workspace context, global commands, health access, and session controls.   | `@dvt/web` | `/`                                                                                                | dbt; dvt-warehouse-source; dvt; monitoring; cost | command palette adoption remains future work                        | `TopAppBar.architecture.test.ts`; `workbench-ui-contract-and-component-inventory.md` |
| `web.component.shell.LeftNavigationRail`      | LeftNavigationRail    | navigation       | current          | standardize    | Authenticated shell root | Project plugin-driven primary route navigation into the shell.                            | `@dvt/web` | `/`                                                                                                | dbt; dvt-warehouse-source; dvt; monitoring; cost | route badges and unavailable states need standardization            | `LeftNavigation.tsx`; `frontend-mechanical-truth-inventory.md`                       |
| `web.component.shell.BottomConsoleDrawer`     | BottomConsoleDrawer   | console-drawer   | current          | harden         | Authenticated shell root | Render supporting execution context without replacing route navigation.                   | `@dvt/web` | `/`                                                                                                | monitoring                                       | typed live-log state remains future work                            | `bottomConsoleDrawerModel.ts`; `workbench-ui-contract-and-component-inventory.md`    |
| `web.component.workbench.RouteWorkbenchFrame` | RouteWorkbenchFrame   | route-workbench  | current          | reuse          | Workbench foundation     | Provide the semantic slot frame used by route workbenches.                                | `@dvt/web` | `/canvas`; `/runs`; `/code`; `/diff`; `/lineage`; `/artifacts`; `/templates`; `/plugins`; `/admin` | dbt; dvt; monitoring; cost                       | route toolbar and context panel extraction remain separate work     | `RouteWorkbenchFrame.test.tsx`; `routeWorkbenchFrame.architecture.test.ts`           |
| `web.component.workbench.WorkbenchStates`     | WorkbenchStates       | state-view       | current          | standardize    | Workbench foundation     | Provide shared loading, empty, error, degraded, and read-only route states.               | `@dvt/web` | `/runs`; `/code`; `/diff`; `/lineage`; `/artifacts`                                                | monitoring; dvt                                  | broader route adoption remains future work                          | `WorkbenchStates.tsx`; `workbench-ui-contract-and-component-inventory.md`            |
| `web.component.canvas.CanvasToolbar`          | CanvasToolbar         | route-toolbar    | current          | extract        | Canvas workbench         | Render graph-local commands, readiness controls, and Canvas workbench actions.            | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt; monitoring; cost                       | shared RouteToolbar extraction; server-readable execution readiness | `CanvasToolbar.test.tsx`; `CanvasToolbar.architecture.test.tsx`                      |
| `web.component.canvas.CanvasViewport`         | CanvasViewport        | canvas-viewport  | current          | harden         | Canvas workbench         | Render the graph as the permanent base surface with React Flow controls and context host. | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt                                         | bottom operational drawer integration                               | `CanvasViewport.test.tsx`; `useCanvasViewportGraphModel.architecture.test.ts`        |
| `web.component.canvas.CanvasContextMenu`      | CanvasContextMenu     | context-panel    | current          | harden         | Canvas workbench         | Resolve canvas and edge context commands without mixing node-specific operations.         | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt                                         | edge and selection contextual menus remain follow-up                | `CanvasViewport.test.tsx`; `canvasInteractionCommandSurface.test.ts`                 |
| `web.component.canvas.GraphNodeCardStrategy`  | GraphNodeCardStrategy | query-view       | current          | extract        | Canvas graph cards       | Project DBT, DVT, and fallback graph node cards through explicit strategy contracts.      | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt                                         | richer runtime metrics depend on real run evidence                  | `graphNodeCardReadModel.test.ts`; `graphNodeCardReadModel.architecture.test.ts`      |
| `web.component.canvas.SourceImportDialog`     | SourceImportDialog    | modal            | current          | harden         | Canvas source discovery  | Browse warehouse connections, schemas, tables, columns, and import selected sources.      | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt-warehouse-source                        | modal-first UX still needs browser proof after panel retirement     | `SourceImportWizard.test.tsx`; `sourceImportWizardModel.test.ts`                     |
| `web.component.canvas.NodeWorkbench`          | NodeWorkbench         | canvas-inspector | partial          | harden         | Canvas node authoring    | Present node properties, columns, metadata, tests, and authoring commands for selection.  | `@dvt/web` | `/canvas`                                                                                          | dbt; dvt                                         | permanent inspector and contextual workbench are not yet converged  | `nodePropertiesReadModel.test.ts`; `CanvasInspectorPanel.test.tsx`                   |
| `web.component.canvas.CanvasWorkbenchTabs`    | CanvasWorkbenchTabs   | tab-strip        | retire           | retire         | Canvas workbench         | Legacy route tabs for graph/code/log surfaces that are superseded by contextual surfaces. | `@dvt/web` | `/canvas/:workbenchTab`                                                                            | dbt; monitoring                                  | retire as primary navigation after drawer and contextual workbench  | `canvasWorkbenchTabs.test.ts`; `canvasWorkbenchTabs.architecture.test.ts`            |

## Frontend Surface Component Links

| Component ID                                  | Surface ID         | Route path              | Placement kind   | Placement order |
| --------------------------------------------- | ------------------ | ----------------------- | ---------------- | --------------- |
| `web.component.shell.AppShellFrame`           | `web.shell.root`   | `/`                     | shell            | 10              |
| `web.component.shell.ShellTopBar`             | `web.shell.root`   | `/`                     | top-bar          | 20              |
| `web.component.shell.LeftNavigationRail`      | `web.shell.root`   | `/`                     | left-navigation  | 30              |
| `web.component.shell.BottomConsoleDrawer`     | `web.shell.root`   | `/`                     | bottom-drawer    | 90              |
| `web.component.workbench.RouteWorkbenchFrame` | `web.canvas.graph` | `/canvas`               | primary-surface  | 40              |
| `web.component.workbench.WorkbenchStates`     | `web.runs.list`    | `/runs`                 | primary-surface  | 50              |
| `web.component.canvas.CanvasToolbar`          | `web.canvas.graph` | `/canvas`               | route-toolbar    | 20              |
| `web.component.canvas.CanvasViewport`         | `web.canvas.graph` | `/canvas`               | primary-surface  | 45              |
| `web.component.canvas.CanvasContextMenu`      | `web.canvas.graph` | `/canvas`               | context-menu     | 46              |
| `web.component.canvas.GraphNodeCardStrategy`  | `web.canvas.graph` | `/canvas`               | graph-card       | 47              |
| `web.component.canvas.SourceImportDialog`     | `web.canvas.graph` | `/canvas`               | modal            | 60              |
| `web.component.canvas.NodeWorkbench`          | `web.canvas.graph` | `/canvas`               | context-panel    | 70              |
| `web.component.canvas.CanvasWorkbenchTabs`    | `web.canvas.tabs`  | `/canvas/:workbenchTab` | legacy-tab-strip | 10              |

## Frontend Component Files

| Component ID                                  | File path                                                                        | File role         | Exported symbol               |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | ----------------------------- |
| `web.component.shell.AppShellFrame`           | `apps/web/src/app/components/shell/AppShellFrame.tsx`                            | component         | AppShellFrame                 |
| `web.component.shell.ShellTopBar`             | `apps/web/src/app/components/TopAppBar.tsx`                                      | component         | TopAppBar                     |
| `web.component.shell.LeftNavigationRail`      | `apps/web/src/app/components/LeftNavigation.tsx`                                 | component         | LeftNavigation                |
| `web.component.shell.BottomConsoleDrawer`     | `apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts`                  | model             | buildBottomConsoleDrawerModel |
| `web.component.workbench.RouteWorkbenchFrame` | `apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx`                  | component         | RouteWorkbenchFrame           |
| `web.component.workbench.WorkbenchStates`     | `apps/web/src/app/components/workbench/state/WorkbenchStates.tsx`                | component         | WorkbenchStates               |
| `web.component.canvas.CanvasToolbar`          | `apps/web/src/app/views/canvas/CanvasToolbar.tsx`                                | component         | CanvasToolbar                 |
| `web.component.canvas.CanvasToolbar`          | `apps/web/src/app/views/canvas/CanvasToolbar.test.tsx`                           | test              | none                          |
| `web.component.canvas.CanvasToolbar`          | `apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx`              | architecture-test | none                          |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/CanvasViewport.tsx`                               | component         | CanvasViewport                |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts`                   | hook              | useCanvasViewportGraphModel   |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`                          | test              | none                          |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts` | architecture-test | none                          |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/CanvasContextMenuView.tsx`                        | component         | CanvasContextMenuView         |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts`               | model             | buildCanvasContextMenuModel   |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`          | test              | none                          |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts`                       | query             | buildGraphNodeCardReadModel   |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts`               | model             | GraphNodeCardStrategy         |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/GraphNodeCardView.tsx`                           | component         | GraphNodeCardView             |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts`                       | model             | dbtGraphNodeCardStrategy      |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts`                       | model             | dvtGraphNodeCardStrategy      |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts`                  | test              | none                          |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts`     | architecture-test | none                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/SourceImportWizard.tsx`                             | component         | SourceImportWizard            |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/WarehouseSourceExplorer.tsx`                        | component         | WarehouseSourceExplorer       |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts`      | model             | buildPreviewGroups            |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/SourceImportWizard.test.tsx`                        | test              | none                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts` | test              | none                          |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/InspectorPanel.tsx`                                 | component         | InspectorPanel                |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/NodePropertiesTabs.tsx`                   | component         | NodePropertiesTabs            |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/nodePropertiesReadModel.ts`               | view-model        | buildNodePropertiesReadModel  |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts`          | test              | none                          |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx`                    | test              | none                          |
| `web.component.canvas.CanvasWorkbenchTabs`    | `apps/web/src/app/views/canvas/CanvasWorkbenchTabStrip.tsx`                      | component         | CanvasWorkbenchTabStrip       |
| `web.component.canvas.CanvasWorkbenchTabs`    | `apps/web/src/app/views/canvas/canvasWorkbenchTabs.ts`                           | model             | buildCanvasWorkbenchTabItems  |
| `web.component.canvas.CanvasWorkbenchTabs`    | `apps/web/src/app/views/canvas/canvasWorkbenchTabs.test.ts`                      | test              | none                          |
| `web.component.canvas.CanvasWorkbenchTabs`    | `apps/web/src/app/views/canvas/canvasWorkbenchTabs.architecture.test.ts`         | architecture-test | none                          |

## Frontend Component Command Query Rails

| Component ID                                  | Rail name                             | Rail kind   | Rail status            |
| --------------------------------------------- | ------------------------------------- | ----------- | ---------------------- |
| `web.component.shell.AppShellFrame`           | `GetRuntimeSession`                   | query       | implemented-api        |
| `web.component.shell.AppShellFrame`           | `GetEffectiveWorkspaceContext`        | query       | implemented-api        |
| `web.component.shell.ShellTopBar`             | `LoadRuntimeCapabilities`             | query       | implemented-api        |
| `web.component.shell.LeftNavigationRail`      | `ListShellNavigationItems`            | local-query | implemented-local      |
| `web.component.shell.BottomConsoleDrawer`     | `GetRunEvents`                        | query       | implemented-api        |
| `web.component.workbench.RouteWorkbenchFrame` | `ListFrontendMechanicalTruthSurfaces` | query       | implemented-projection |
| `web.component.workbench.WorkbenchStates`     | `ListFrontendMechanicalTruthSurfaces` | query       | implemented-projection |
| `web.component.canvas.CanvasToolbar`          | `StartRun`                            | command     | implemented-api        |
| `web.component.canvas.CanvasToolbar`          | `ValidateCanvasExecutionReadiness`    | query       | gap-needed             |
| `web.component.canvas.CanvasViewport`         | `RenderCanvasContextualGraphSurface`  | query       | implemented-projection |
| `web.component.canvas.CanvasViewport`         | `GetCanvasLayout`                     | query       | implemented-local      |
| `web.component.canvas.CanvasContextMenu`      | `ResolveCanvasContextMenu`            | query       | implemented-local      |
| `web.component.canvas.CanvasContextMenu`      | `CreateCanvasAuthoringNode`           | command     | implemented-local      |
| `web.component.canvas.CanvasContextMenu`      | `ImportWarehouseSources`              | command     | implemented-api        |
| `web.component.canvas.CanvasContextMenu`      | `PreviewExecutablePlan`               | command     | implemented-api        |
| `web.component.canvas.CanvasContextMenu`      | `RemoveCanvasEdgeFromContext`         | command     | implemented-local      |
| `web.component.canvas.GraphNodeCardStrategy`  | `ProjectGraphNodeCardReadModel`       | query       | implemented-projection |
| `web.component.canvas.GraphNodeCardStrategy`  | `RenderGraphNodeCardMetrics`          | query       | implemented-projection |
| `web.component.canvas.SourceImportDialog`     | `ListWarehouseConnections`            | query       | implemented-api        |
| `web.component.canvas.SourceImportDialog`     | `ListWarehouseConnectionTables`       | query       | implemented-api        |
| `web.component.canvas.SourceImportDialog`     | `ImportWarehouseSources`              | command     | implemented-api        |
| `web.component.canvas.SourceImportDialog`     | `CreateWarehouseConnection`           | command     | implemented-api        |
| `web.component.canvas.SourceImportDialog`     | `TestWarehouseConnection`             | command     | implemented-api        |
| `web.component.canvas.NodeWorkbench`          | `InspectCanvasNodeProperties`         | query       | implemented-local      |
| `web.component.canvas.NodeWorkbench`          | `ConfigureCanvasDbtNode`              | command     | implemented-local      |
| `web.component.canvas.NodeWorkbench`          | `ConfigureCanvasDvtNode`              | command     | implemented-local      |
| `web.component.canvas.CanvasWorkbenchTabs`    | `ListCanvasWorkbenchTabs`             | query       | not-front-default      |
| `web.component.canvas.CanvasWorkbenchTabs`    | `SelectCanvasWorkbenchTab`            | command     | not-front-default      |

## Frontend Component Evidence

| Evidence ID                                               | Component ID                                  | Evidence kind     | Evidence ref                                                                        | Evidence status |
| --------------------------------------------------------- | --------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- | --------------- |
| `web.component.shell.AppShellFrame.docs`                  | `web.component.shell.AppShellFrame`           | documentation     | `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`           | accepted        |
| `web.component.shell.ShellTopBar.architecture`            | `web.component.shell.ShellTopBar`             | architecture-test | `apps/web/src/app/components/TopAppBar.architecture.test.ts`                        | accepted        |
| `web.component.shell.LeftNavigationRail.source`           | `web.component.shell.LeftNavigationRail`      | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md` | accepted        |
| `web.component.shell.BottomConsoleDrawer.docs`            | `web.component.shell.BottomConsoleDrawer`     | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md` | accepted        |
| `web.component.workbench.RouteWorkbenchFrame.unit`        | `web.component.workbench.RouteWorkbenchFrame` | unit-test         | `apps/web/src/app/components/workbench/RouteWorkbenchFrame.test.tsx`                | accepted        |
| `web.component.workbench.WorkbenchStates.docs`            | `web.component.workbench.WorkbenchStates`     | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md` | accepted        |
| `web.component.canvas.CanvasToolbar.unit`                 | `web.component.canvas.CanvasToolbar`          | presentation-test | `apps/web/src/app/views/canvas/CanvasToolbar.test.tsx`                              | accepted        |
| `web.component.canvas.CanvasToolbar.architecture`         | `web.component.canvas.CanvasToolbar`          | architecture-test | `apps/web/src/app/views/canvas/CanvasToolbar.architecture.test.tsx`                 | accepted        |
| `web.component.canvas.CanvasViewport.presentation`        | `web.component.canvas.CanvasViewport`         | presentation-test | `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`                             | accepted        |
| `web.component.canvas.CanvasViewport.architecture`        | `web.component.canvas.CanvasViewport`         | architecture-test | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts`    | accepted        |
| `web.component.canvas.CanvasContextMenu.unit`             | `web.component.canvas.CanvasContextMenu`      | unit-test         | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`             | accepted        |
| `web.component.canvas.GraphNodeCardStrategy.unit`         | `web.component.canvas.GraphNodeCardStrategy`  | unit-test         | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts`                     | accepted        |
| `web.component.canvas.GraphNodeCardStrategy.architecture` | `web.component.canvas.GraphNodeCardStrategy`  | architecture-test | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts`        | accepted        |
| `web.component.canvas.SourceImportDialog.presentation`    | `web.component.canvas.SourceImportDialog`     | presentation-test | `apps/web/src/app/components/SourceImportWizard.test.tsx`                           | accepted        |
| `web.component.canvas.SourceImportDialog.unit`            | `web.component.canvas.SourceImportDialog`     | unit-test         | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts`    | accepted        |
| `web.component.canvas.NodeWorkbench.unit`                 | `web.component.canvas.NodeWorkbench`          | unit-test         | `apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts`             | accepted        |
| `web.component.canvas.NodeWorkbench.presentation`         | `web.component.canvas.NodeWorkbench`          | presentation-test | `apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx`                       | accepted        |
| `web.component.canvas.CanvasWorkbenchTabs.unit`           | `web.component.canvas.CanvasWorkbenchTabs`    | unit-test         | `apps/web/src/app/views/canvas/canvasWorkbenchTabs.test.ts`                         | accepted        |
| `web.component.canvas.CanvasWorkbenchTabs.architecture`   | `web.component.canvas.CanvasWorkbenchTabs`    | architecture-test | `apps/web/src/app/views/canvas/canvasWorkbenchTabs.architecture.test.ts`            | accepted        |
