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
  canvasPalette,
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
  onSourceImportComplete,
  importedNodeFocusIds,
  onImportedNodeFocusComplete,
  onHideExplorer,
  onShowExplorer,
  onHideInspector,
  onShowInspector,
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onReloadLatestDraft,
  onPlan,
  onRun,
  draftSaveStatus,
  hasStaleDraftVersion,
  canStartRun,
  planStatusSummary,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  canvasAuthoringMode,
  transformationValidation,
  centerSurface,
  readOnlyBanner,
}: CanvasShellProps) {
  const [dataRegistryOpen, setDataRegistryOpen] = useState(false);

  useEffect(() => {
    if (!userPermissions.canEditEdges && dataRegistryOpen) {
      setDataRegistryOpen(false);
    }
  }, [dataRegistryOpen, userPermissions.canEditEdges]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {!focusMode && explorerPanelVisible && (
        <>
          <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
            <DbtExplorer
              nodes={explorerNodes}
              canEditGraph={userPermissions.canEditEdges}
              onHide={onHideExplorer}
              onOpenDataRegistry={
                userPermissions.canEditEdges ? () => setDataRegistryOpen(true) : undefined
              }
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
        <div className="h-full flex flex-col bg-[var(--surface-panel)]">
          <CanvasToolbar
            placement="top-bar"
            onAutoLayout={onAutoLayout}
            onToggleCostOverlay={onToggleCostOverlay}
            onToggleImpact={onToggleImpact}
            onToggleColumns={onToggleColumns}
            onReloadLatestDraft={onReloadLatestDraft}
            onPlan={onPlan}
            onRun={onRun}
            draftSaveStatus={draftSaveStatus}
            hasStaleDraftVersion={hasStaleDraftVersion}
            canPlan={userPermissions.canPlan}
            canRun={userPermissions.canRun}
            canEditEdges={userPermissions.canEditEdges}
            canStartRun={canStartRun}
            planStatusSummary={planStatusSummary}
            canvasAuthoringMode={canvasAuthoringMode}
            exclusiveOverlayMode={exclusiveOverlayMode}
            canUseCostOverlay={canUseCostOverlay}
            impactOverlayEnabled={impactOverlayEnabled}
            columnLevelLineageEnabled={columnLevelLineageEnabled}
            transformationValidation={transformationValidation}
            nodeCount={nodesWithImpact.length}
            edgeCount={edges.length}
          />
          {readOnlyBanner ? <div className="shrink-0">{readOnlyBanner}</div> : null}
          {centerSurface ?? (
            <CanvasViewport
              focusMode={focusMode}
              explorerPanelVisible={explorerPanelVisible}
              inspectorPanelVisible={inspectorPanelVisible}
              canEditEdges={userPermissions.canEditEdges}
              nodesWithImpact={nodesWithImpact}
              edges={edges}
              nodeTypes={nodeTypes}
              gridSize={gridSize}
              canvasPalette={canvasPalette}
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
              importedNodeFocusIds={importedNodeFocusIds}
              onImportedNodeFocusComplete={onImportedNodeFocusComplete}
              onShowExplorer={onShowExplorer}
              onShowInspector={onShowInspector}
            />
          )}
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

      <SourceImportWizard
        open={dataRegistryOpen}
        onClose={() => setDataRegistryOpen(false)}
        onComplete={onSourceImportComplete}
      />
    </ResizablePanelGroup>
  );
}
