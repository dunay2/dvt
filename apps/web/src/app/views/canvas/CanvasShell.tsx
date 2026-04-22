/**
 * Owned concern: compose the Canvas shell layout from grouped view-model slices.
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

function resolveCanvasShellMainPanelDefaultSize(layout: CanvasShellLayout): number {
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
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  onHideExplorer: CanvasShellChromeCommands['onHideExplorer'];
  onOpenDataRegistry?: () => void;
}>;

function CanvasShellExplorerRail({
  layout,
  panels,
  onHideExplorer,
  onOpenDataRegistry,
}: CanvasShellExplorerRailProps): JSX.Element | null {
  if (layout.focusMode || !layout.explorerPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
        <DbtExplorer
          nodes={panels.explorerNodes}
          canEditGraph={panels.userPermissions.canEditEdges}
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
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  toolbar: CanvasShellToolbar;
  centerSurface?: CanvasShellProps['centerSurface'];
  readOnlyBanner?: CanvasShellProps['readOnlyBanner'];
}>;

function CanvasShellMainPanel({
  layout,
  panels,
  graph,
  graphCommands,
  chromeCommands,
  toolbar,
  centerSurface,
  readOnlyBanner,
}: CanvasShellMainPanelProps): JSX.Element {
  return (
    <ResizablePanel defaultSize={resolveCanvasShellMainPanelDefaultSize(layout)}>
      <div className="h-full flex flex-col bg-(--surface-panel)">
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={toolbar.onAutoLayout}
          onToggleCostOverlay={toolbar.onToggleCostOverlay}
          onToggleImpact={toolbar.onToggleImpact}
          onToggleColumns={toolbar.onToggleColumns}
          onReloadLatestDraft={toolbar.onReloadLatestDraft}
          onPlan={toolbar.onPlan}
          onRun={toolbar.onRun}
          draftToolbarState={toolbar.draftToolbarState}
          canPlan={panels.userPermissions.canPlan}
          canRun={panels.userPermissions.canRun}
          canEditEdges={panels.userPermissions.canEditEdges}
          canStartRun={toolbar.canStartRun}
          planStatusSummary={toolbar.planStatusSummary}
          canvasAuthoringMode={graph.canvasAuthoringMode}
          exclusiveOverlayMode={toolbar.exclusiveOverlayMode}
          canUseCostOverlay={toolbar.canUseCostOverlay}
          impactOverlayEnabled={toolbar.impactOverlayEnabled}
          columnLevelLineageEnabled={toolbar.columnLevelLineageEnabled}
          transformationValidation={toolbar.transformationValidation}
          nodeCount={graph.nodesWithImpact.length}
          edgeCount={graph.edges.length}
        />
        {readOnlyBanner ? <div className="shrink-0">{readOnlyBanner}</div> : null}
        {centerSurface ?? (
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
            importedNodeFocusIds={graphCommands.importedNodeFocusIds}
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
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  onHideInspector: CanvasShellChromeCommands['onHideInspector'];
}>;

function CanvasShellInspectorRail({
  layout,
  panels,
  onHideInspector,
}: CanvasShellInspectorRailProps): JSX.Element | null {
  if (layout.focusMode || !layout.inspectorPanelVisible) {
    return null;
  }

  return (
    <>
      <ResizableHandle />
      <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
        <InspectorPanel
          node={panels.inspectorNode}
          activeRunId={panels.activeRunId}
          registeredPlugins={panels.registeredPlugins}
          onHide={onHideInspector}
        />
      </ResizablePanel>
    </>
  );
}

export default function CanvasShell(props: CanvasShellProps) {
  const {
    layout,
    panels,
    graph,
    graphCommands,
    chromeCommands,
    toolbar,
    centerSurface,
    readOnlyBanner,
  } = props;
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);
  const canOpenDataRegistry = panels.userPermissions.canEditEdges && layout.canOpenSourceImport;
  const openDataRegistry = canOpenDataRegistry ? () => setDataRegistryOpen(true) : undefined;

  useEffect(() => {
    if (!canOpenDataRegistry && dataRegistryOpen) {
      setDataRegistryOpen(false);
    }
  }, [canOpenDataRegistry, dataRegistryOpen]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <CanvasShellExplorerRail
        layout={layout}
        panels={panels}
        onHideExplorer={chromeCommands.onHideExplorer}
        onOpenDataRegistry={openDataRegistry}
      />

      <CanvasShellMainPanel
        layout={layout}
        panels={panels}
        graph={graph}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        toolbar={toolbar}
        centerSurface={centerSurface}
        readOnlyBanner={readOnlyBanner}
      />

      <CanvasShellInspectorRail
        layout={layout}
        panels={panels}
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
