/** Owned concern: compose Canvas toolbar, viewport, and center-surface overlay inside the main shell panel. */
import {
  ResizablePanel,
} from '../../components/ui/resizable';
import CanvasToolbar from './CanvasToolbar';
import CanvasViewport from './CanvasViewport';
import type {
  CanvasShellChromeCommands,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellPanels,
  CanvasShellToolbar,
} from './canvasShell.types';

function resolveCanvasShellMainPanelDefaultSize(
  layout: Pick<
    CanvasShellLayout,
    'focusMode' | 'explorerPanelVisible' | 'inspectorPanelVisible'
  >
): number {
  if (layout.focusMode) {
    return 100;
  }

  if (layout.explorerPanelVisible && layout.inspectorPanelVisible) {
    return 63;
  }

  if (layout.explorerPanelVisible || layout.inspectorPanelVisible) {
    return 80;
  }

  return 100;
}

type CanvasShellMainPanelProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  toolbar: CanvasShellToolbar;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
}>;

function CanvasShellViewport({
  layout,
  panels,
  graph,
  graphCommands,
  chromeCommands,
}: Pick<
  CanvasShellMainPanelProps,
  'layout' | 'panels' | 'graph' | 'graphCommands' | 'chromeCommands'
>): JSX.Element {
  return (
    <CanvasViewport
      focusMode={layout.focusMode}
      explorerPanelVisible={layout.explorerPanelVisible}
      inspectorPanelVisible={layout.inspectorPanelVisible}
      canEditEdges={panels.userPermissions.canEditEdges}
      nodesWithImpact={graph.nodesWithImpact}
      edges={graph.edges}
      nodeTypes={graph.nodeTypes}
      gridSize={graph.gridSize}
      canvasPalette={graph.canvasPalette}
      viewport={graph.viewport}
      onNodesChange={graphCommands.onNodesChange}
      onNodeDragStop={graphCommands.onNodeDragStop}
      onEdgesChange={graphCommands.onEdgesChange}
      onConnect={graphCommands.onConnect}
      onNodeClick={graphCommands.onNodeClick}
      onSelectionChange={graphCommands.onSelectionChange}
      onViewportChange={graphCommands.onViewportChange}
      onDrop={graphCommands.onDrop}
      onDragOver={graphCommands.onDragOver}
      importedNodeFocusIds={panels.importedNodeFocusIds}
      onImportedNodeFocusComplete={graphCommands.onImportedNodeFocusComplete}
      onShowExplorer={chromeCommands.onShowExplorer}
      onShowInspector={chromeCommands.onShowInspector}
    />
  );
}

function CanvasShellMainSurface({
  layout,
  panels,
  graph,
  graphCommands,
  chromeCommands,
}: Pick<
  CanvasShellMainPanelProps,
  'layout' | 'panels' | 'graph' | 'graphCommands' | 'chromeCommands'
>): JSX.Element {
  const viewport = (
    <CanvasShellViewport
      layout={layout}
      panels={panels}
      graph={graph}
      graphCommands={graphCommands}
      chromeCommands={chromeCommands}
    />
  );

  if (layout.centerSurface == null) {
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

export function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  toolbar,
  graphCommands,
  chromeCommands,
}: CanvasShellMainPanelProps): JSX.Element {
  return (
    <ResizablePanel defaultSize={resolveCanvasShellMainPanelDefaultSize(layout)}>
      <div className="h-full flex flex-col bg-(--surface-panel)">
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={chromeCommands.onAutoLayout}
          onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
          onToggleImpact={chromeCommands.onToggleImpact}
          onToggleColumns={chromeCommands.onToggleColumns}
          onReloadLatestDraft={chromeCommands.onReloadLatestDraft}
          onPlan={chromeCommands.onPlan}
          onRun={chromeCommands.onRun}
          routeState={toolbar.routeState}
          draftToolbarState={toolbar.draftToolbarState}
          canPlan={panels.userPermissions.canPlan}
          canRun={panels.userPermissions.canRun}
          canEditEdges={panels.userPermissions.canEditEdges}
          canStartRun={toolbar.canStartRun}
          planStatusSummary={toolbar.planStatusSummary}
          canvasAuthoringMode={toolbar.canvasAuthoringMode}
          exclusiveOverlayMode={toolbar.exclusiveOverlayMode}
          canUseCostOverlay={toolbar.canUseCostOverlay}
          impactOverlayEnabled={toolbar.impactOverlayEnabled}
          columnLevelLineageEnabled={toolbar.columnLevelLineageEnabled}
          transformationValidation={toolbar.transformationValidation}
          nodeCount={graph.nodesWithImpact.length}
          edgeCount={graph.edges.length}
        />
        {layout.readOnlyBanner ? <div className="shrink-0">{layout.readOnlyBanner}</div> : null}
        <CanvasShellMainSurface
          layout={layout}
          panels={panels}
          graph={graph}
          graphCommands={graphCommands}
          chromeCommands={chromeCommands}
        />
      </div>
    </ResizablePanel>
  );
}
