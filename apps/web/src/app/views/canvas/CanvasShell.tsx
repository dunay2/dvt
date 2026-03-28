import DbtExplorer from '../../components/DbtExplorer';
import InspectorPanel from '../../components/InspectorPanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../components/ui/resizable';
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
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onSelectionChange,
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
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {!focusMode && explorerPanelVisible && (
        <>
          <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
            <DbtExplorer nodes={explorerNodes} onHide={onHideExplorer} />
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
          />
          <CanvasViewport
            focusMode={focusMode}
            explorerPanelVisible={explorerPanelVisible}
            inspectorPanelVisible={inspectorPanelVisible}
            nodesWithImpact={nodesWithImpact}
            edges={edges}
            nodeTypes={nodeTypes}
            gridSize={gridSize}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onSelectionChange={onSelectionChange}
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
    </ResizablePanelGroup>
  );
}
