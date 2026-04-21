/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useEffect, useState } from 'react';
import DbtExplorer from '../../components/DbtExplorer';
import InspectorPanel from '../../components/InspectorPanel';
import SourceImportWizard from '../../components/SourceImportWizard';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import CanvasToolbar from './CanvasToolbar';
import CanvasViewport from './CanvasViewport';
import type {
  CanvasShellChromeCommands,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellPanels,
  CanvasShellProps,
  CanvasShellToolbar,
} from './canvasShell.types';

function resolveCanvasShellMainPanelDefaultSize(
  layout: Pick<CanvasShellLayout, 'focusMode' | 'explorerPanelVisible' | 'inspectorPanelVisible'>
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

type CanvasShellExplorerRailProps = Readonly<{
  focusMode: boolean;
  explorerPanelVisible: boolean;
  explorerNodes: CanvasShellPanels['explorerNodes'];
  canEditGraph: boolean;
  onHideExplorer: CanvasShellChromeCommands['onHideExplorer'];
  onOpenDataRegistry?: () => void;
}>;

function CanvasShellExplorerRail({
  focusMode,
  explorerPanelVisible,
  explorerNodes,
  canEditGraph,
  onHideExplorer,
  onOpenDataRegistry,
}: CanvasShellExplorerRailProps) {
  if (focusMode || !explorerPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
        <DbtExplorer
          nodes={explorerNodes}
          canEditGraph={canEditGraph}
          onHide={onHideExplorer}
          onOpenDataRegistry={onOpenDataRegistry}
        />
      </ResizablePanel>
      <ResizableHandle />
    </>
  );
}

type CanvasShellMainPanelProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  toolbar: CanvasShellToolbar;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
}>;

function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  toolbar,
  graphCommands,
  chromeCommands,
}: CanvasShellMainPanelProps) {
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
        {layout.centerSurface ?? (
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
        )}
      </div>
    </ResizablePanel>
  );
}

type CanvasShellInspectorRailProps = Readonly<{
  focusMode: boolean;
  inspectorPanelVisible: boolean;
  inspectorNode: CanvasShellPanels['inspectorNode'];
  activeRunId: CanvasShellPanels['activeRunId'];
  registeredPlugins: CanvasShellPanels['registeredPlugins'];
  onHideInspector: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasShellInspectorRail({
  focusMode,
  inspectorPanelVisible,
  inspectorNode,
  activeRunId,
  registeredPlugins,
  onHideInspector,
}: CanvasShellInspectorRailProps) {
  if (focusMode || !inspectorPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizableHandle />
      <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
        <InspectorPanel
          node={inspectorNode}
          activeRunId={activeRunId}
          registeredPlugins={registeredPlugins}
          onHide={onHideInspector}
        />
      </ResizablePanel>
    </>
  );
}

export default function CanvasShell({
  layout,
  panels,
  graph,
  toolbar,
  graphCommands,
  chromeCommands,
}: Readonly<CanvasShellProps>) {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const canEditGraph = panels.userPermissions.canEditEdges;
  const handleOpenDataRegistry = canEditGraph ? () => setDataRegistryOpen(true) : undefined;

  useEffect(() => {
    if (!canEditGraph && dataRegistryOpen) {
      setDataRegistryOpen(false);
    }
  }, [canEditGraph, dataRegistryOpen]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <CanvasShellExplorerRail
        focusMode={layout.focusMode}
        explorerPanelVisible={layout.explorerPanelVisible}
        explorerNodes={panels.explorerNodes}
        canEditGraph={canEditGraph}
        onHideExplorer={chromeCommands.onHideExplorer}
        onOpenDataRegistry={handleOpenDataRegistry}
      />

      <CanvasShellMainPanel
        layout={layout}
        panels={panels}
        graph={graph}
        toolbar={toolbar}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
      />

      <CanvasShellInspectorRail
        focusMode={layout.focusMode}
        inspectorPanelVisible={layout.inspectorPanelVisible}
        inspectorNode={panels.inspectorNode}
        activeRunId={panels.activeRunId}
        registeredPlugins={panels.registeredPlugins}
        onHideInspector={chromeCommands.onHideInspector}
      />

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => setDataRegistryOpen(false)}
        onComplete={graphCommands.onSourceImportComplete}
      />
    </ResizablePanelGroup>
  );
}
