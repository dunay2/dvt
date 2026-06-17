/** Owned concern: compose Canvas chrome state, viewport, and center-surface overlay inside the main shell panel. */
import { ResizablePanel } from '../../components/ui/resizable';
import { CanvasGraphStatusOverlay } from './CanvasGraphStatusOverlay';
import { CanvasNodeWorkbenchOverlay } from './CanvasNodeWorkbenchOverlay';
import { CanvasViewMenuContributionRegistrar } from './CanvasViewMenuControls';
import CanvasViewport from './CanvasViewport';
import { CanvasWorkspaceMenuContributionRegistrar } from './CanvasWorkspaceMenuControls';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type {
  CanvasShellChromeCommands,
  CanvasShellChromeState,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellPanels,
} from './canvasShell.types';

function resolveCanvasShellMainPanelDefaultSize(): number {
  return 100;
}

type CanvasShellMainPanelProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  chromeState: CanvasShellChromeState;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  onOpenSourceImport?: CanvasShellOpenDataRegistryCommand;
  onOpenProjectExplorer?: () => void;
  onOpenCanvasSettings?: () => void;
  contextMenuPresenter: CanvasContextMenuPresenter;
}>;

function CanvasShellMenuContributionRegistrars({
  panels,
  graph,
  chromeState,
  chromeCommands,
}: Pick<
  CanvasShellMainPanelProps,
  'panels' | 'graph' | 'chromeState' | 'chromeCommands'
>): JSX.Element {
  return (
    <>
      <CanvasViewMenuContributionRegistrar
        canEditEdges={panels.userPermissions.canEditEdges}
        canUseCostOverlay={chromeState.canUseCostOverlay}
        exclusiveOverlayMode={chromeState.exclusiveOverlayMode}
        impactOverlayEnabled={chromeState.impactOverlayEnabled}
        columnLevelLineageEnabled={chromeState.columnLevelLineageEnabled}
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canvasEmptyStateGuideVisible={graph.canvasEmptyStateGuideVisible}
        onAutoLayout={chromeCommands.onAutoLayout}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onSetCanvasEmptyStateGuideVisible={chromeCommands.onSetCanvasEmptyStateGuideVisible}
      />
      <CanvasWorkspaceMenuContributionRegistrar
        activeCanvas={panels.activeCanvas}
        canExportProjectSnapshot={chromeState.canExportProjectSnapshot}
        canImportProjectSnapshot={chromeState.canImportProjectSnapshot}
        onExportProjectSnapshot={chromeCommands.onExportProjectSnapshot}
        onImportProjectSnapshotFile={chromeCommands.onImportProjectSnapshotFile}
      />
    </>
  );
}

function CanvasShellViewport({
  layout,
  panels,
  graph,
  graphCommands,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenCanvasSettings,
  canPreviewExecutionPlan,
  onPreviewExecutionPlan,
  contextMenuPresenter,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'onOpenSourceImport'
  | 'onOpenProjectExplorer'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
> &
  Readonly<{
    canPreviewExecutionPlan: boolean;
    onPreviewExecutionPlan: CanvasShellChromeCommands['onPlan'];
  }>): JSX.Element {
  const handleNodeClick: CanvasShellGraphCommands['onNodeClick'] = (event, node) => {
    graphCommands.onNodeClick(event, node);
  };

  return (
    <CanvasViewport
      canEditEdges={panels.userPermissions.canEditEdges}
      nodesWithImpact={graph.nodesWithImpact}
      edges={graph.edges}
      nodeTypes={graph.nodeTypes}
      gridSize={graph.gridSize}
      canvasPalette={graph.canvasPalette}
      canvasGridVisible={graph.canvasGridVisible}
      canvasGridColor={graph.canvasGridColor}
      canvasSnapToGrid={graph.canvasSnapToGrid}
      viewport={graph.viewport}
      onNodesChange={graphCommands.onNodesChange}
      onNodeDrag={graphCommands.onNodeDrag}
      onNodeDragStop={graphCommands.onNodeDragStop}
      onEdgesChange={graphCommands.onEdgesChange}
      onConnect={graphCommands.onConnect}
      onReconnect={graphCommands.onReconnect}
      onNodeClick={handleNodeClick}
      onSelectionChange={graphCommands.onSelectionChange}
      onViewportChange={graphCommands.onViewportChange}
      onDrop={graphCommands.onDrop}
      onDragOver={graphCommands.onDragOver}
      authoringNodeKinds={panels.authoringNodeKinds}
      onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}
      importedNodeFocusIds={panels.importedNodeFocusIds}
      onImportedNodeFocusComplete={graphCommands.onImportedNodeFocusComplete}
      canOpenSourceImport={typeof onOpenSourceImport === 'function'}
      onOpenSourceImport={
        onOpenSourceImport == null
          ? undefined
          : (flowPosition) =>
              onOpenSourceImport(
                undefined,
                flowPosition == null ? undefined : { canvasPosition: flowPosition }
              )
      }
      canOpenProjectExplorer={typeof onOpenProjectExplorer === 'function'}
      onOpenProjectExplorer={onOpenProjectExplorer}
      canPreviewExecutionPlan={canPreviewExecutionPlan}
      onPreviewExecutionPlan={onPreviewExecutionPlan}
      canOpenCanvasSettings={typeof onOpenCanvasSettings === 'function'}
      onOpenCanvasSettings={onOpenCanvasSettings}
      contextMenuPresenter={contextMenuPresenter}
    />
  );
}

function CanvasShellMainSurface({
  layout,
  panels,
  graph,
  graphCommands,
  chromeCommands,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenCanvasSettings,
  canPreviewExecutionPlan,
  contextMenuPresenter,
}: Pick<
  CanvasShellMainPanelProps,
  | 'layout'
  | 'panels'
  | 'graph'
  | 'graphCommands'
  | 'chromeCommands'
  | 'onOpenSourceImport'
  | 'onOpenProjectExplorer'
  | 'onOpenCanvasSettings'
  | 'contextMenuPresenter'
> &
  Readonly<{ canPreviewExecutionPlan: boolean }>): JSX.Element {
  const viewport = (
    <CanvasShellViewport
      layout={layout}
      panels={panels}
      graph={graph}
      graphCommands={graphCommands}
      onOpenSourceImport={onOpenSourceImport}
      onOpenProjectExplorer={onOpenProjectExplorer}
      onOpenCanvasSettings={onOpenCanvasSettings}
      canPreviewExecutionPlan={canPreviewExecutionPlan}
      onPreviewExecutionPlan={chromeCommands.onPlan}
      contextMenuPresenter={contextMenuPresenter}
    />
  );

  if (layout.centerSurface == null) {
    if (layout.workbenchTabPanel != null) {
      return <>{layout.workbenchTabPanel}</>;
    }

    return viewport;
  }

  if (layout.centerSurfaceMode === 'replace') {
    return <>{layout.centerSurface}</>;
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      {viewport}
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-none h-full">{layout.centerSurface}</div>
      </div>
    </div>
  );
}

function CanvasShellNodeWorkbenchOverlay({
  layout,
  panels,
  chromeCommands,
}: Pick<CanvasShellMainPanelProps, 'layout' | 'panels' | 'chromeCommands'>): JSX.Element | null {
  return (
    <CanvasNodeWorkbenchOverlay
      layout={layout}
      panels={panels}
      onHide={chromeCommands.onHideInspector}
    />
  );
}

export function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenCanvasSettings,
  contextMenuPresenter,
}: CanvasShellMainPanelProps): JSX.Element {
  const shouldShowGraphStatusOverlay =
    layout.centerSurface == null || layout.centerSurfaceMode === 'overlay';

  return (
    <ResizablePanel defaultSize={resolveCanvasShellMainPanelDefaultSize()}>
      <div className="relative h-full flex flex-col bg-(--surface-panel)">
        <CanvasShellMenuContributionRegistrars
          panels={panels}
          graph={graph}
          chromeState={chromeState}
          chromeCommands={chromeCommands}
        />
        {layout.readOnlyBanner ? <div className="shrink-0">{layout.readOnlyBanner}</div> : null}
        <CanvasShellMainSurface
          layout={layout}
          panels={panels}
          graph={graph}
          graphCommands={graphCommands}
          chromeCommands={chromeCommands}
          onOpenSourceImport={onOpenSourceImport}
          onOpenProjectExplorer={onOpenProjectExplorer}
          onOpenCanvasSettings={onOpenCanvasSettings}
          canPreviewExecutionPlan={panels.userPermissions.canPlan && chromeState.canPlanGraph}
          contextMenuPresenter={contextMenuPresenter}
        />
        {shouldShowGraphStatusOverlay ? (
          <CanvasGraphStatusOverlay
            activeCanvas={panels.activeCanvas}
            draftStatusState={chromeState.draftStatusState}
            onReloadLatestDraft={chromeCommands.onReloadLatestDraft}
          />
        ) : null}
        <CanvasShellNodeWorkbenchOverlay
          layout={layout}
          panels={panels}
          chromeCommands={chromeCommands}
        />
      </div>
    </ResizablePanel>
  );
}
