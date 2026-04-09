# Repo Surface Inventory

## Shell

- `apps/web/src/app/Root.tsx`
- `apps/web/src/app/components/TopAppBar.tsx`
- `apps/web/src/app/components/LeftNavigation.tsx`
- `apps/web/src/app/components/Console.tsx`
- `apps/web/src/app/components/ShellHealthBanner.tsx`

## Routing

- `apps/web/src/app/routes.ts`
- `apps/web/src/app/shell/useShellRuntime.ts`
- `apps/web/src/app/shell/shellRuntimeModel.ts`

## Canvas stack

- `apps/web/src/app/views/Canvas.tsx`
- `apps/web/src/app/views/canvas/CanvasShell.tsx`
- `apps/web/src/app/views/canvas/CanvasToolbar.tsx`
- `apps/web/src/app/views/canvas/CanvasViewport.tsx`
- `apps/web/src/app/views/canvas/useCanvasController.ts`

## Route surfaces

- `apps/web/src/app/views/CodeView.tsx`
- `apps/web/src/app/views/DiffView.tsx`
- `apps/web/src/app/views/RunsView.tsx`
- `apps/web/src/app/views/ArtifactsView.tsx`
- `apps/web/src/app/views/PluginsView.tsx`
- `apps/web/src/app/views/AdminView.tsx`
- `apps/web/src/app/views/LineageView.tsx`
- `apps/web/src/app/views/CostView.tsx`

## Reusable route composite

- `apps/web/src/app/components/domain/ViewHeader.tsx`

## Monaco

- `apps/web/src/app/components/monaco/MonacoCodeSurface.tsx`
- `apps/web/src/app/components/monaco/MonacoDiffSurface.tsx`
- `apps/web/src/app/components/monaco/MonacoViewerFallback.tsx`

## Plugins

- `apps/web/src/app/plugins/contracts/PluginManifest.ts`
- `apps/web/src/app/plugins/registry.ts`
- `apps/web/src/app/plugins/dbt/dbtContributions.ts`
- `apps/web/src/app/plugins/monitoring/monitoringContributions.ts`

## Stores

- `apps/web/src/app/stores/uiLayoutStore.ts`
- `apps/web/src/app/stores/sessionStore.ts`
- `apps/web/src/app/stores/canvasInteractionStore.ts`
- `apps/web/src/app/stores/executionStore.ts`
- `apps/web/src/app/stores/appStore.ts`

## Styling

- `apps/web/src/styles/theme.css`
- `apps/web/src/styles/index.css`
