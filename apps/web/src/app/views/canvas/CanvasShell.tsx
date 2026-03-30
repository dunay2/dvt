import DbtExplorer from '../../components/DbtExplorer';
import InspectorPanel from '../../components/InspectorPanel';
import SourceImportWizard from '../../components/SourceImportWizard';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
import { useState } from 'react';
import CanvasToolbar from './CanvasToolbar';
import CanvasViewport from './CanvasViewport';
import type { CanvasShellProps } from './canvasShell.types';

export default function CanvasShell({
  focusMode,
  explorerPanelVisible,
  inspectorPanelVisible,
  explorerNodes,
  inspectorNode,
  activeRunId,
  registeredPlugins,
  userPermissions,
  nodesWithImpact,
  edges,
  nodeTypes,
  gridSize,
  viewport,
  onNodesChange,
  onNodeDragStop,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onDrop,
  onDragOver,
  onHideExplorer,
  onShowExplorer,
  onHideInspector,
  onShowInspector,
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
}: CanvasShellProps) {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {!focusMode && explorerPanelVisible && (
        <>
          <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
            <DbtExplorer
              nodes={explorerNodes}
              onHide={onHideExplorer}
              onOpenDataRegistry={() => setDataRegistryOpen(true)}
            />
          </ResizablePanel>
          <ResizableHandle />
        </>
      )}

      <ResizablePanel
        defaultSize={
          focusMode
            ? 100
            : explorerPanelVisible && inspectorPanelVisible
              ? 63
              : explorerPanelVisible || inspectorPanelVisible
                ? 80
                : 100
        }
      >
        <div className="h-full flex flex-col bg-slate-950">
          <CanvasToolbar
            onOpenDataRegistry={() => setDataRegistryOpen(true)}
            onAutoLayout={onAutoLayout}
            onToggleCostOverlay={onToggleCostOverlay}
            onToggleImpact={onToggleImpact}
            onToggleColumns={onToggleColumns}
            onPlan={onPlan}
            onRun={onRun}
            exclusiveOverlayMode={exclusiveOverlayMode}
            canUseCostOverlay={canUseCostOverlay}
            impactOverlayEnabled={impactOverlayEnabled}
            columnLevelLineageEnabled={columnLevelLineageEnabled}
            nodeCount={nodesWithImpact.length}
            edgeCount={edges.length}
          />
          <CanvasViewport
            focusMode={focusMode}
            explorerPanelVisible={explorerPanelVisible}
            inspectorPanelVisible={inspectorPanelVisible}
            nodesWithImpact={nodesWithImpact}
            edges={edges}
            nodeTypes={nodeTypes}
            gridSize={gridSize}
            viewport={viewport}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onSelectionChange={onSelectionChange}
            onViewportChange={onViewportChange}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onShowExplorer={onShowExplorer}
            onShowInspector={onShowInspector}
          />
        </div>
      </ResizablePanel>

      {!focusMode && inspectorPanelVisible && (
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
      )}

      <SourceImportWizard open={dataRegistryOpen} onClose={() => setDataRegistryOpen(false)} />
    </ResizablePanelGroup>
  );
}
