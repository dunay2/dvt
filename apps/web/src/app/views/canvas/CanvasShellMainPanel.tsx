/** Owned concern: compose Canvas chrome state, viewport, and center-surface overlay inside the main shell panel. */
import { ResizablePanel } from '../../components/ui/resizable';
import { CanvasGraphStatusOverlay } from './CanvasGraphStatusOverlay';
import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import CanvasViewport from './CanvasViewport';
import { CanvasViewMenuContributionRegistrar } from './CanvasViewMenuControls';
import { CanvasWorkspaceMenuContributionRegistrar } from './CanvasWorkspaceMenuControls';
import type {
  CanvasShellChromeCommands,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellPanels,
  CanvasShellChromeState,
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
  canPreviewExecutionPlan,
  onPreviewExecutionPlan,
}: Pick<
  CanvasShellMainPanelProps,
  'layout' | 'panels' | 'graph' | 'graphCommands' | 'onOpenSourceImport'
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
        onOpenSourceImport == null ? undefined : () => onOpenSourceImport(undefined)
      }
      canPreviewExecutionPlan={canPreviewExecutionPlan}
      onPreviewExecutionPlan={onPreviewExecutionPlan}
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
  canPreviewExecutionPlan,
}: Pick<
  CanvasShellMainPanelProps,
  'layout' | 'panels' | 'graph' | 'graphCommands' | 'chromeCommands' | 'onOpenSourceImport'
> &
  Readonly<{ canPreviewExecutionPlan: boolean }>): JSX.Element {
  const viewport = (
    <CanvasShellViewport
      layout={layout}
      panels={panels}
      graph={graph}
      graphCommands={graphCommands}
      onOpenSourceImport={onOpenSourceImport}
      canPreviewExecutionPlan={canPreviewExecutionPlan}
      onPreviewExecutionPlan={chromeCommands.onPlan}
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
        <div className="pointer-events-auto h-full">{layout.centerSurface}</div>
      </div>
    </div>
  );
}

function CanvasShellNodeWorkbenchOverlay({
  layout,
  panels,
  chromeCommands,
}: Pick<CanvasShellMainPanelProps, 'layout' | 'panels' | 'chromeCommands'>): JSX.Element | null {
  const nodeWorkbenchPlacement = layout.surfaceStrategy?.nodeWorkbench.placement;

  if (
    nodeWorkbenchPlacement !== 'contextual-overlay' ||
    layout.focusMode ||
    !layout.inspectorPanelVisible ||
    panels.inspectorNode == null
  ) {
    return null;
  }

  return (
    <div
      data-slot="canvas-node-workbench-overlay"
      className="absolute top-16 right-4 bottom-4 z-20 w-[min(28rem,calc(100%-2rem))] overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] shadow-xl"
    >
      <CanvasInspectorPanel
        node={panels.inspectorNode}
        nodes={panels.inspectorGraphNodes}
        edges={panels.inspectorGraphEdges}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        preferredTabId={panels.inspectorPreferredTabId}
        preferredTabRequestId={panels.inspectorPreferredTabRequestId}
        onHide={chromeCommands.onHideInspector}
        authoring={panels.inspectorAuthoring}
      />
    </div>
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
          canPreviewExecutionPlan={panels.userPermissions.canPlan && chromeState.canPlanGraph}
        />
        {shouldShowGraphStatusOverlay ? (
          <CanvasGraphStatusOverlay
            activeCanvas={panels.activeCanvas}
            draftToolbarState={chromeState.draftToolbarState}
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
