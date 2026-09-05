---
title: Frontend Component Inventory
status: Active
owner: Web / Architecture
last_reviewed: 2026-08-16
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
pnpm planning:db:query frontend-component-files --component web.component.canvas.CanvasShellChrome
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

| Component ID                                  | Component name          | Component kind     | Component status | Reuse decision | Frontend owner           | Responsibility                                                                                                    | Package    | Route scope                                                                     | Plugin scope                                     | Capability gaps                                                                 | Evidence                                                                                               |
| --------------------------------------------- | ----------------------- | ------------------ | ---------------- | -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `web.component.shell.AppShellFrame`           | AppShellFrame           | shell-frame        | current          | reuse          | Authenticated shell root | Render the persistent application shell frame around route workbenches.                                           | `@dvt/web` | `/`                                                                             | dbt; dvt-warehouse-source; dvt; monitoring; cost | richer operational drawer product semantics                                     | `AppShellFrame.test.tsx`; `frontend-mechanical-truth-inventory.md`                                     |
| `web.component.shell.ShellTopBar`             | ShellTopBar             | shell-bar          | current          | harden         | Authenticated shell root | Render compact workspace context, global commands, health access, and session controls.                           | `@dvt/web` | `/`                                                                             | dbt; dvt-warehouse-source; dvt; monitoring; cost | command palette adoption remains future work                                    | `TopAppBar.architecture.test.ts`; `workbench-ui-contract-and-component-inventory.md`                   |
| `web.component.shell.LeftNavigationRail`      | LeftNavigationRail      | navigation         | current          | standardize    | Authenticated shell root | Project plugin-driven primary route navigation into the shell.                                                    | `@dvt/web` | `/`                                                                             | dbt; dvt-warehouse-source; dvt; monitoring; cost | route badges and unavailable states need standardization                        | `LeftNavigation.tsx`; `frontend-mechanical-truth-inventory.md`                                         |
| `web.component.shell.BottomOperationalDrawer` | BottomOperationalDrawer | operational-drawer | current          | harden         | Authenticated shell root | Render Log, Problems, Runs, and Preview in the shell bottom operational drawer.                                   | `@dvt/web` | `/`                                                                             | monitoring                                       | structured live-log presentation remains future work                            | `bottomOperationalDrawerLogModel.ts`; `workbench-ui-contract-and-component-inventory.md`               |
| `web.component.workbench.RouteWorkbenchFrame` | RouteWorkbenchFrame     | route-workbench    | current          | reuse          | Workbench foundation     | Provide the semantic slot frame used by route workbenches.                                                        | `@dvt/web` | `/canvas`; `/canvas/:workbenchTab`; `/runs`; `/templates`; `/plugins`; `/admin` | dbt; dvt; monitoring; cost                       | route toolbar and context panel extraction remain separate work                 | `RouteWorkbenchFrame.test.tsx`; `routeWorkbenchFrame.architecture.test.ts`                             |
| `web.component.workbench.WorkbenchStates`     | WorkbenchStates         | state-view         | current          | standardize    | Workbench foundation     | Provide shared loading, empty, error, degraded, and read-only route states.                                       | `@dvt/web` | `/runs`; `/canvas/:workbenchTab`                                                | monitoring; dvt                                  | broader route adoption remains future work                                      | `WorkbenchStates.tsx`; `workbench-ui-contract-and-component-inventory.md`                              |
| `web.component.templates.TemplatesWorkbench`  | TemplatesWorkbench      | route-workbench    | current          | harden         | Templates workbench      | Own template selection, parameter capture, deterministic preview, and Monaco inspection.                          | `@dvt/web` | `/templates`                                                                    | dvt                                              | backend template persistence remains future work                                | `templatesViewModel.test.ts`; `templatesWorkbench.architecture.test.ts`                                |
| `web.component.artifacts.ArtifactsWorkbench`  | ArtifactsWorkbench      | route-workbench    | current          | harden         | Artifacts workbench      | Own read-only workspace/imported artifact inspection and Monaco read-only preview mapping.                        | `@dvt/web` | `/canvas/:workbenchTab`                                                         | dbt                                              | artifact editing and persistence remain out of scope                            | `ArtifactsView.test.tsx`; `artifactsMonacoReadonlyViewer.architecture.test.ts`                         |
| `web.component.canvas.CanvasShellChrome`      | CanvasShellChrome       | route-toolbar      | current          | harden         | Canvas workbench         | Compose Canvas shell chrome state, menu contributions, readiness controls, and run actions.                       | `@dvt/web` | `/canvas`                                                                       | dbt; dvt; monitoring; cost                       | shared RouteToolbar extraction remains retired unless a product rail reopens it | `CanvasShell.architecture.test.tsx`; `canvasPlanReadiness.test.ts`                                     |
| `web.component.canvas.CanvasViewport`         | CanvasViewport          | canvas-viewport    | current          | harden         | Canvas workbench         | Render the graph as the permanent base surface with React Flow controls and context host.                         | `@dvt/web` | `/canvas`                                                                       | dbt; dvt                                         | bottom operational drawer integration                                           | `CanvasViewport.test.tsx`; `useCanvasViewportGraphModel.architecture.test.ts`                          |
| `web.component.canvas.CanvasContextMenu`      | CanvasContextMenu       | context-panel      | current          | harden         | Canvas workbench         | Resolve canvas and edge context commands without mixing node-specific operations.                                 | `@dvt/web` | `/canvas`                                                                       | dbt; dvt                                         | edge and selection contextual menus remain follow-up                            | `CanvasViewport.test.tsx`; `canvasInteractionCommandSurface.test.ts`                                   |
| `web.component.canvas.GraphNodeCardStrategy`  | GraphNodeCardStrategy   | query-view         | current          | extract        | Canvas graph cards       | Project shared Source/Model cards plus distinct plugin concepts through explicit strategy contracts.              | `@dvt/web` | `/canvas`                                                                       | dbt; dvt                                         | richer runtime metrics depend on real run evidence                              | `graphNodeCardReadModel.test.ts`; `graphNodeCardReadModel.architecture.test.ts`                        |
| `web.component.canvas.CanvasSurfaceStrategy`  | CanvasSurfaceStrategy   | query-view         | current          | extract        | Canvas workbench         | Project shared Canvas placement across native and external-authority runtimes.                                    | `@dvt/web` | `/canvas`                                                                       | dbt; dvt                                         | bottom drawer rendering remains separate product slice                          | `graphStrategyRegistry.test.ts`; `canvasDraftAuthoringComponent.architecture.test.ts`                  |
| `web.component.canvas.SourceImportDialog`     | SourceImportDialog      | modal              | current          | harden         | Canvas source discovery  | Browse warehouse connections, schemas, tables, columns, and import selected sources.                              | `@dvt/web` | `/canvas`                                                                       | dbt; dvt-warehouse-source                        | modal-first UX still needs browser proof after panel retirement                 | `SourceImportWizard.test.tsx`; `sourceImportWizardModel.test.ts`                                       |
| `web.component.canvas.NodeWorkbench`          | NodeWorkbench           | canvas-inspector   | current          | reuse          | Canvas node authoring    | Present node properties and the authoritative backing file inline through shared Monaco and workspace-file rails. | `@dvt/web` | `/canvas`                                                                       | dbt; dvt                                         | richer resource-specific property sections remain separate slices               | `CanvasNodeWorkbenchPanel.contributions.test.tsx`; `canvasNodeWorkbenchHardening.architecture.test.ts` |

## Frontend Surface Component Links

| Component ID                                  | Surface ID         | Route path              | Placement kind  | Placement order |
| --------------------------------------------- | ------------------ | ----------------------- | --------------- | --------------- |
| `web.component.shell.AppShellFrame`           | `web.shell.root`   | `/`                     | shell           | 10              |
| `web.component.shell.ShellTopBar`             | `web.shell.root`   | `/`                     | top-bar         | 20              |
| `web.component.shell.LeftNavigationRail`      | `web.shell.root`   | `/`                     | left-navigation | 30              |
| `web.component.shell.BottomOperationalDrawer` | `web.shell.root`   | `/`                     | bottom-drawer   | 90              |
| `web.component.workbench.RouteWorkbenchFrame` | `web.canvas.graph` | `/canvas`               | primary-surface | 40              |
| `web.component.workbench.WorkbenchStates`     | `web.runs.list`    | `/runs`                 | primary-surface | 50              |
| `web.component.templates.TemplatesWorkbench`  | `web.templates`    | `/templates`            | primary-surface | 40              |
| `web.component.artifacts.ArtifactsWorkbench`  | `web.canvas.tabs`  | `/canvas/:workbenchTab` | workbench-tab   | 50              |
| `web.component.canvas.CanvasShellChrome`      | `web.canvas.graph` | `/canvas`               | route-toolbar   | 20              |
| `web.component.canvas.CanvasViewport`         | `web.canvas.graph` | `/canvas`               | primary-surface | 45              |
| `web.component.canvas.CanvasContextMenu`      | `web.canvas.graph` | `/canvas`               | context-menu    | 46              |
| `web.component.canvas.GraphNodeCardStrategy`  | `web.canvas.graph` | `/canvas`               | graph-card      | 47              |
| `web.component.canvas.CanvasSurfaceStrategy`  | `web.canvas.graph` | `/canvas`               | surface-policy  | 48              |
| `web.component.canvas.SourceImportDialog`     | `web.canvas.graph` | `/canvas`               | modal           | 60              |
| `web.component.canvas.NodeWorkbench`          | `web.canvas.graph` | `/canvas`               | context-panel   | 70              |

## Frontend Component Files

| Component ID                                  | File path                                                                             | File role         | Exported symbol                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| `web.component.shell.AppShellFrame`           | `apps/web/src/app/components/shell/AppShellFrame.tsx`                                 | component         | AppShellFrame                                 |
| `web.component.shell.ShellTopBar`             | `apps/web/src/app/components/TopAppBar.tsx`                                           | component         | TopAppBar                                     |
| `web.component.shell.LeftNavigationRail`      | `apps/web/src/app/components/LeftNavigation.tsx`                                      | component         | LeftNavigation                                |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/BottomOperationalDrawer.tsx`                       | component         | BottomOperationalDrawer                       |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts`                | model             | buildBottomOperationalDrawerLogModel          |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/OperationalDrawerPanels.tsx`                       | component         | BottomOperationalDrawerBody                   |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx`                  | test              | none                                          |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts`           | test              | none                                          |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx`                  | test              | none                                          |
| `web.component.shell.BottomOperationalDrawer` | `apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts`      | architecture-test | none                                          |
| `web.component.workbench.RouteWorkbenchFrame` | `apps/web/src/app/components/workbench/RouteWorkbenchFrame.tsx`                       | component         | RouteWorkbenchFrame                           |
| `web.component.workbench.WorkbenchStates`     | `apps/web/src/app/components/workbench/state/WorkbenchStates.tsx`                     | component         | WorkbenchStates                               |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/TemplatesView.tsx`                                            | view              | TemplatesView                                 |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/TemplatesView.test.tsx`                                       | test              | none                                          |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx`                        | component         | TemplatesRouteWorkbench                       |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx`                     | component         | TemplateMonacoPreviewPanel                    |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx`                | test              | none                                          |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/templatesViewModel.ts`                              | view-model        | EXECUTION_TEMPLATE_CATALOG                    |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/templatesViewModel.test.ts`                         | test              | none                                          |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts`            | architecture-test | none                                          |
| `web.component.templates.TemplatesWorkbench`  | `apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts`        | architecture-test | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/ArtifactsView.tsx`                                            | view              | ArtifactsView                                 |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/ArtifactsView.test.tsx`                                       | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.tsx`                     | adapter           | ArtifactMonacoPreviewPanel                    |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx`                | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactPreviewTabs.tsx`                            | component         | ArtifactPreviewTabs                           |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactsInfoCard.tsx`                              | component         | ArtifactsInfoCard                             |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactsList.tsx`                                  | component         | ArtifactsList                                 |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts` | architecture-test | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/artifactsRouteBootstrap.ts`                         | view-model        | deriveArtifactsRouteBootstrapPresentation     |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/artifactsRouteBootstrap.test.ts`                    | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ArtifactsStateViews.tsx`                            | component         | ArtifactsStateViews                           |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/artifactsWorkbenchStateModel.ts`                    | model             | getArtifactsWorkbenchState                    |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/artifactsWorkbenchStateModel.test.ts`               | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/constants.ts`                                       | model             | ArtifactPreviewDocumentMap                    |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/copy.ts`                                            | model             | artifactsViewCopy                             |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/ManifestImportPanel.tsx`                            | component         | ManifestImportPanel                           |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/manifestParser.ts`                                  | model             | parseManifestFile                             |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/manifestParser.test.ts`                             | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/structuredArtifactContent.ts`                       | model             | formatStructuredArtifactContent               |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/structuredArtifactContent.test.ts`                  | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/types.ts`                                           | model             | ArtifactPreview                               |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/useArtifactsViewModel.ts`                           | view-model        | useArtifactsViewModel                         |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/useArtifactsViewModel.test.tsx`                     | test              | none                                          |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/useLocalManifestImport.ts`                          | hook              | useLocalManifestImport                        |
| `web.component.artifacts.ArtifactsWorkbench`  | `apps/web/src/app/views/artifacts/utils.ts`                                           | model             | formatFileSize                                |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx`                              | component         | CanvasShellMainPanel                          |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts`                      | view-model        | buildCanvasShellChromeState                   |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts`                   | adapter           | buildCanvasShellChromeCommands                |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/canvasPlanReadiness.ts`                                | query             | observePlanRunReadiness                       |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts`                           | test              | none                                          |
| `web.component.canvas.CanvasShellChrome`      | `apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx`                     | architecture-test | none                                          |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/CanvasViewport.tsx`                                    | component         | CanvasViewport                                |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts`                        | hook              | useCanvasViewportGraphModel                   |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`                               | test              | none                                          |
| `web.component.canvas.CanvasViewport`         | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts`      | architecture-test | none                                          |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/CanvasContextMenuView.tsx`                             | component         | CanvasContextMenuView                         |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts`                    | model             | buildCanvasContextMenuModel                   |
| `web.component.canvas.CanvasContextMenu`      | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`               | test              | none                                          |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts`                            | query             | buildGraphNodeCardReadModel                   |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts`                    | model             | GraphNodeCardStrategy                         |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/GraphNodeCardView.tsx`                                | component         | GraphNodeCardView                             |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/sharedSourceModelGraphNodeCardStrategy.ts`            | model             | sharedSourceModelGraphNodeCardStrategy        |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts`                            | model             | dbtGraphNodeCardStrategy                      |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts`                            | model             | dvtGraphNodeCardStrategy                      |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts`                       | test              | none                                          |
| `web.component.canvas.GraphNodeCardStrategy`  | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts`          | architecture-test | none                                          |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts`                          | model             | CanvasSurfaceStrategy                         |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/plugins/dbt/dbtCanvasSurfaceStrategy.ts`                            | model             | dbtCanvasSurfaceStrategy                      |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/plugins/dvt/dvtCanvasSurfaceStrategy.ts`                            | model             | dvtCanvasSurfaceStrategy                      |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/plugins/graphStrategyRegistry.ts`                                   | query             | resolveCanvasSurfaceStrategy                  |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/plugins/graphStrategyRegistry.test.ts`                              | test              | none                                          |
| `web.component.canvas.CanvasSurfaceStrategy`  | `apps/web/src/app/views/canvas/canvasActiveGraphStrategy.test.ts`                     | test              | none                                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/SourceImportWizard.tsx`                                  | component         | SourceImportWizard                            |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx`          | component         | SourceImportWizardFrame                       |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.tsx`          | component         | SourceImportSectionTabs                       |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx`          | component         | SourceImportCatalogView                       |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts`           | model             | buildSourceImportCatalogViewModel             |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/SourceImportWizard.test.tsx`                             | test              | none                                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/SourceImportWizard.metadata.test.tsx`                    | test              | none                                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx`     | test              | none                                          |
| `web.component.canvas.SourceImportDialog`     | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts`      | test              | none                                          |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/InspectorPanel.tsx`                                      | component         | InspectorPanel                                |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/NodePropertiesTabs.tsx`                        | component         | NodePropertiesTabs                            |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/nodePropertiesReadModel.ts`                    | view-model        | buildNodePropertiesReadModel                  |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts`               | test              | none                                          |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx`                         | test              | none                                          |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/code/WorkspaceFileCodeEditor.tsx`                             | component         | WorkspaceFileCodeEditor                       |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/canvas/dbtWorkspaceFileCodeContribution.tsx`                  | component         | createDbtWorkspaceFileCodeContribution        |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/canvas/graphDraftWorkspaceFileCodeContribution.tsx`           | component         | createGraphDraftWorkspaceFileCodeContribution |
| `web.component.canvas.NodeWorkbench`          | `apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts`     | architecture-test | none                                          |

## Frontend Component Command Query Rails

| Component ID                                  | Rail                                    | Type    | Rail name                               | Rail kind   | Rail status            | DDD owner                                  |
| --------------------------------------------- | --------------------------------------- | ------- | --------------------------------------- | ----------- | ---------------------- | ------------------------------------------ |
| `web.component.shell.AppShellFrame`           | `GetRuntimeSession`                     | query   | `GetRuntimeSession`                     | query       | implemented-api        | Runtime session read model                 |
| `web.component.shell.AppShellFrame`           | `GetEffectiveWorkspaceContext`          | query   | `GetEffectiveWorkspaceContext`          | query       | implemented-api        | Workspace context read model               |
| `web.component.shell.ShellTopBar`             | `GetRuntimeCapabilities`                | query   | `GetRuntimeCapabilities`                | query       | implemented-api        | Runtime capabilities read model            |
| `web.component.shell.LeftNavigationRail`      | `ListShellNavigationItems`              | query   | `ListShellNavigationItems`              | local-query | implemented-local      | Shell navigation read model                |
| `web.component.shell.BottomOperationalDrawer` | `GetRunEvents`                          | query   | `GetRunEvents`                          | query       | implemented-api        | Run events read model                      |
| `web.component.shell.BottomOperationalDrawer` | `BuildBottomOperationalDrawerLogModel`  | query   | `BuildBottomOperationalDrawerLogModel`  | local-query | implemented-local      | Bottom drawer log presentation model       |
| `web.component.shell.BottomOperationalDrawer` | `ResolveOperationalDrawerContribution`  | query   | `ResolveOperationalDrawerContribution`  | local-query | implemented-local      | Route-contributed operational drawer model |
| `web.component.workbench.RouteWorkbenchFrame` | `ListFrontendMechanicalTruthSurfaces`   | query   | `ListFrontendMechanicalTruthSurfaces`   | query       | implemented-projection | Frontend mechanical truth read model       |
| `web.component.workbench.WorkbenchStates`     | `ListFrontendMechanicalTruthSurfaces`   | query   | `ListFrontendMechanicalTruthSurfaces`   | query       | implemented-projection | Frontend mechanical truth read model       |
| `web.component.templates.TemplatesWorkbench`  | `ListExecutionTemplateProfiles`         | query   | `ListExecutionTemplateProfiles`         | query       | implemented-local      | Execution template profile read model      |
| `web.component.templates.TemplatesWorkbench`  | `GenerateExecutionTemplatePreview`      | query   | `GenerateExecutionTemplatePreview`      | query       | implemented-local      | Execution template preview read model      |
| `web.component.templates.TemplatesWorkbench`  | `SelectExecutionTemplateProfile`        | command | `SelectExecutionTemplateProfile`        | command     | implemented-local      | Execution template selection state         |
| `web.component.templates.TemplatesWorkbench`  | `UpdateExecutionTemplateParameterValue` | command | `UpdateExecutionTemplateParameterValue` | command     | implemented-local      | Execution template parameter state         |
| `web.component.artifacts.ArtifactsWorkbench`  | `ListWorkspaceArtifacts`                | query   | `ListWorkspaceArtifacts`                | query       | implemented-projection | Workspace artifact preview read model      |
| `web.component.artifacts.ArtifactsWorkbench`  | `ListWorkspaceFiles`                    | query   | `ListWorkspaceFiles`                    | query       | implemented-api        | Workspace file tree read model             |
| `web.component.artifacts.ArtifactsWorkbench`  | `GetWorkspaceFileContent`               | query   | `GetWorkspaceFileContent`               | query       | implemented-api        | Workspace file content read model          |
| `web.component.canvas.CanvasShellChrome`      | `StartRun`                              | command | `StartRun`                              | command     | implemented-api        | Run command application service            |
| `web.component.canvas.CanvasShellChrome`      | `ObservePlanRunReadiness`               | query   | `ObservePlanRunReadiness`               | query       | implemented-local      | Canvas plan readiness read model           |
| `web.component.canvas.CanvasViewport`         | `RenderCanvasContextualGraphSurface`    | query   | `RenderCanvasContextualGraphSurface`    | query       | implemented-projection | Canvas contextual graph read model         |
| `web.component.canvas.CanvasViewport`         | `GetCanvasLayout`                       | query   | `GetCanvasLayout`                       | query       | implemented-local      | Canvas layout read model                   |
| `web.component.canvas.CanvasContextMenu`      | `ResolveCanvasContextMenu`              | query   | `ResolveCanvasContextMenu`              | query       | implemented-local      | Canvas context menu read model             |
| `web.component.canvas.CanvasContextMenu`      | `CreateCanvasAuthoringNode`             | command | `CreateCanvasAuthoringNode`             | command     | implemented-local      | Canvas authoring aggregate                 |
| `web.component.canvas.CanvasContextMenu`      | `ImportWarehouseSources`                | command | `ImportWarehouseSources`                | command     | implemented-api        | Warehouse source import aggregate          |
| `web.component.canvas.CanvasContextMenu`      | `PreviewExecutionPlan`                  | command | `PreviewExecutionPlan`                  | command     | implemented-api        | Execution preview application service      |
| `web.component.canvas.CanvasContextMenu`      | `RemoveCanvasEdgeFromContext`           | command | `RemoveCanvasEdgeFromContext`           | command     | implemented-local      | Canvas edge authoring aggregate            |
| `web.component.canvas.GraphNodeCardStrategy`  | `ProjectGraphNodeCardReadModel`         | query   | `ProjectGraphNodeCardReadModel`         | query       | implemented-projection | Graph node card read model                 |
| `web.component.canvas.GraphNodeCardStrategy`  | `RenderGraphNodeCardMetrics`            | query   | `RenderGraphNodeCardMetrics`            | query       | implemented-projection | Graph node metric read model               |
| `web.component.canvas.CanvasSurfaceStrategy`  | `ResolveCanvasSurfaceStrategy`          | query   | `ResolveCanvasSurfaceStrategy`          | query       | implemented-local      | Canvas surface strategy read model         |
| `web.component.canvas.SourceImportDialog`     | `ListWarehouseConnections`              | query   | `ListWarehouseConnections`              | query       | implemented-api        | Warehouse connection read model            |
| `web.component.canvas.SourceImportDialog`     | `ListWarehouseConnectionSourceObjects`  | query   | `ListWarehouseConnectionSourceObjects`  | query       | implemented-api        | Provider-neutral SourceObject catalog      |
| `web.component.canvas.SourceImportDialog`     | `ImportWarehouseSources`                | command | `ImportWarehouseSources`                | command     | implemented-api        | Warehouse source import aggregate          |
| `web.component.canvas.SourceImportDialog`     | `CreateWarehouseConnection`             | command | `CreateWarehouseConnection`             | command     | implemented-api        | Warehouse connection aggregate             |
| `web.component.canvas.SourceImportDialog`     | `TestWarehouseConnection`               | command | `TestWarehouseConnection`               | command     | implemented-api        | Warehouse connection validation service    |
| `web.component.canvas.NodeWorkbench`          | `InspectCanvasNodeProperties`           | query   | `InspectCanvasNodeProperties`           | query       | implemented-local      | Canvas node properties read model          |
| `web.component.canvas.NodeWorkbench`          | `GetWorkspaceFileContent`               | query   | `GetWorkspaceFileContent`               | query       | implemented-api        | Workspace file content read model          |
| `web.component.canvas.NodeWorkbench`          | `SaveWorkspaceFileContent`              | command | `SaveWorkspaceFileContent`              | command     | implemented-api        | Workspace file authority                   |
| `web.component.canvas.NodeWorkbench`          | `ConfigureCanvasDbtNode`                | command | `ConfigureCanvasDbtNode`                | command     | implemented-local      | Canvas DBT node aggregate                  |
| `web.component.canvas.NodeWorkbench`          | `ConfigureCanvasDvtNode`                | command | `ConfigureCanvasDvtNode`                | command     | implemented-local      | Canvas DVT node aggregate                  |

## Frontend Component Evidence

| Evidence ID                                                | Component ID                                  | Evidence kind     | Evidence ref                                                                               | Evidence status |
| ---------------------------------------------------------- | --------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ | --------------- |
| `web.component.shell.AppShellFrame.docs`                   | `web.component.shell.AppShellFrame`           | documentation     | `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`                  | accepted        |
| `web.component.shell.ShellTopBar.architecture`             | `web.component.shell.ShellTopBar`             | architecture-test | `apps/web/src/app/components/TopAppBar.architecture.test.ts`                               | accepted        |
| `web.component.shell.LeftNavigationRail.source`            | `web.component.shell.LeftNavigationRail`      | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`        | accepted        |
| `web.component.shell.BottomOperationalDrawer.docs`         | `web.component.shell.BottomOperationalDrawer` | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`        | accepted        |
| `web.component.shell.BottomOperationalDrawer.component`    | `web.component.shell.BottomOperationalDrawer` | presentation-test | `apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx`                       | accepted        |
| `web.component.shell.BottomOperationalDrawer.model`        | `web.component.shell.BottomOperationalDrawer` | unit-test         | `apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts`                | accepted        |
| `web.component.shell.BottomOperationalDrawer.architecture` | `web.component.shell.BottomOperationalDrawer` | architecture-test | `apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts`           | accepted        |
| `web.component.workbench.RouteWorkbenchFrame.unit`         | `web.component.workbench.RouteWorkbenchFrame` | unit-test         | `apps/web/src/app/components/workbench/RouteWorkbenchFrame.test.tsx`                       | accepted        |
| `web.component.workbench.WorkbenchStates.docs`             | `web.component.workbench.WorkbenchStates`     | documentation     | `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`        | accepted        |
| `web.component.templates.TemplatesWorkbench.view`          | `web.component.templates.TemplatesWorkbench`  | presentation-test | `apps/web/src/app/views/TemplatesView.test.tsx`                                            | accepted        |
| `web.component.templates.TemplatesWorkbench.model`         | `web.component.templates.TemplatesWorkbench`  | unit-test         | `apps/web/src/app/views/templates/templatesViewModel.test.ts`                              | accepted        |
| `web.component.templates.TemplatesWorkbench.architecture`  | `web.component.templates.TemplatesWorkbench`  | architecture-test | `apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts`                 | accepted        |
| `web.component.templates.TemplatesWorkbench.monaco`        | `web.component.templates.TemplatesWorkbench`  | architecture-test | `apps/web/src/app/views/templates/templatesMonacoPreview.architecture.test.ts`             | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.docs`          | `web.component.artifacts.ArtifactsWorkbench`  | documentation     | `docs/architecture/components/web/artifacts/artifacts-monaco-readonly-viewer-component.md` | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.view`          | `web.component.artifacts.ArtifactsWorkbench`  | presentation-test | `apps/web/src/app/views/ArtifactsView.test.tsx`                                            | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.model`         | `web.component.artifacts.ArtifactsWorkbench`  | unit-test         | `apps/web/src/app/views/artifacts/useArtifactsViewModel.test.tsx`                          | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.state`         | `web.component.artifacts.ArtifactsWorkbench`  | unit-test         | `apps/web/src/app/views/artifacts/artifactsWorkbenchStateModel.test.ts`                    | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.bootstrap`     | `web.component.artifacts.ArtifactsWorkbench`  | unit-test         | `apps/web/src/app/views/artifacts/artifactsRouteBootstrap.test.ts`                         | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.parser`        | `web.component.artifacts.ArtifactsWorkbench`  | unit-test         | `apps/web/src/app/views/artifacts/manifestParser.test.ts`                                  | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.formatter`     | `web.component.artifacts.ArtifactsWorkbench`  | unit-test         | `apps/web/src/app/views/artifacts/structuredArtifactContent.test.ts`                       | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.monaco`        | `web.component.artifacts.ArtifactsWorkbench`  | presentation-test | `apps/web/src/app/views/artifacts/ArtifactMonacoPreviewPanel.test.tsx`                     | accepted        |
| `web.component.artifacts.ArtifactsWorkbench.architecture`  | `web.component.artifacts.ArtifactsWorkbench`  | architecture-test | `apps/web/src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts`      | accepted        |
| `web.component.canvas.CanvasShellChrome.readiness`         | `web.component.canvas.CanvasShellChrome`      | unit-test         | `apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts`                                | accepted        |
| `web.component.canvas.CanvasShellChrome.architecture`      | `web.component.canvas.CanvasShellChrome`      | architecture-test | `apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx`                          | accepted        |
| `web.component.canvas.CanvasViewport.presentation`         | `web.component.canvas.CanvasViewport`         | presentation-test | `apps/web/src/app/views/canvas/CanvasViewport.test.tsx`                                    | accepted        |
| `web.component.canvas.CanvasViewport.architecture`         | `web.component.canvas.CanvasViewport`         | architecture-test | `apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts`           | accepted        |
| `web.component.canvas.CanvasContextMenu.unit`              | `web.component.canvas.CanvasContextMenu`      | unit-test         | `apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts`                    | accepted        |
| `web.component.canvas.GraphNodeCardStrategy.unit`          | `web.component.canvas.GraphNodeCardStrategy`  | unit-test         | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts`                            | accepted        |
| `web.component.canvas.GraphNodeCardStrategy.architecture`  | `web.component.canvas.GraphNodeCardStrategy`  | architecture-test | `apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts`               | accepted        |
| `web.component.canvas.CanvasSurfaceStrategy.unit`          | `web.component.canvas.CanvasSurfaceStrategy`  | unit-test         | `apps/web/src/app/plugins/graphStrategyRegistry.test.ts`                                   | accepted        |
| `web.component.canvas.CanvasSurfaceStrategy.architecture`  | `web.component.canvas.CanvasSurfaceStrategy`  | architecture-test | `apps/web/src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts`         | accepted        |
| `web.component.canvas.SourceImportDialog.presentation`     | `web.component.canvas.SourceImportDialog`     | presentation-test | `apps/web/src/app/components/SourceImportWizard.test.tsx`                                  | accepted        |
| `web.component.canvas.SourceImportDialog.catalog-view`     | `web.component.canvas.SourceImportDialog`     | presentation-test | `apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx`          | accepted        |
| `web.component.canvas.SourceImportDialog.browser-proof`    | `web.component.canvas.SourceImportDialog`     | e2e-test          | `apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts`                        | accepted        |
| `web.component.canvas.SourceImportDialog.unit`             | `web.component.canvas.SourceImportDialog`     | unit-test         | `apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts`           | accepted        |
| `web.component.canvas.NodeWorkbench.unit`                  | `web.component.canvas.NodeWorkbench`          | unit-test         | `apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts`                    | accepted        |
| `web.component.canvas.NodeWorkbench.presentation`          | `web.component.canvas.NodeWorkbench`          | presentation-test | `apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx`                              | accepted        |
| `web.component.canvas.NodeWorkbench.inline-code`           | `web.component.canvas.NodeWorkbench`          | presentation-test | `apps/web/src/app/views/code/WorkspaceFileCodeEditor.test.tsx`                             | accepted        |
| `web.component.canvas.NodeWorkbench.hard-cut`              | `web.component.canvas.NodeWorkbench`          | architecture-test | `apps/web/src/app/views/canvas/canvasNodeWorkbenchHardening.architecture.test.ts`          | accepted        |
