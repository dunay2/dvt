import { ReactFlowProvider } from '@xyflow/react';

import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import type { ExecutionPlan } from '../types/dbt';
import {
  CanvasEmptyStateView,
  CanvasErrorStateView,
  CanvasLoadingStateView,
  CanvasReadOnlyBannerView,
} from './canvas/CanvasStateViews';
import CanvasShell from './canvas/CanvasShell';
import {
  getCanvasReadOnlyState,
  getCanvasWorkbenchState,
} from './canvas/canvasWorkbenchStateModel';
import { canvasViewCopy } from './canvas/copy';
import { useCanvasController } from './canvas/useCanvasController';

function CanvasContent() {
  const controller = useCanvasController();
  const workbenchState = getCanvasWorkbenchState({
    canonicalNodeCount: controller.explorerNodes.length,
    isLoadingGraph: controller.isLoadingGraph,
    graphErrorMessage: controller.graphErrorMessage,
  });
  const readOnlyState = getCanvasReadOnlyState(controller.userPermissions);

  function renderCenterSurface() {
    switch (workbenchState.kind) {
      case 'loading':
        return <CanvasLoadingStateView />;
      case 'error':
        return (
          <CanvasErrorStateView
            message={workbenchState.message || canvasViewCopy.routeErrorFallbackMessage}
          />
        );
      case 'empty':
        return <CanvasEmptyStateView />;
      case 'ready':
        return undefined;
    }
  }

  return (
    <>
      <CanvasShell
        focusMode={controller.focusMode}
        explorerPanelVisible={controller.explorerPanelVisible}
        inspectorPanelVisible={controller.inspectorPanelVisible}
        explorerNodes={controller.explorerNodes}
        inspectorNode={controller.inspectorNode}
        activeRunId={controller.activeRunId}
        registeredPlugins={controller.registeredPlugins}
        userPermissions={controller.userPermissions}
        canvasAuthoringMode={controller.canvasAuthoringMode}
        nodesWithImpact={controller.nodesWithImpact}
        edges={controller.edges}
        nodeTypes={controller.nodeTypes}
        gridSize={controller.gridSize}
        viewport={controller.viewport}
        onNodesChange={controller.onNodesChange}
        onNodeDragStop={controller.handleNodeDragStop}
        onEdgesChange={controller.onEdgesChange}
        onConnect={controller.onConnect}
        onNodeClick={controller.handleNodeClick}
        onSelectionChange={controller.onSelectionChange}
        onViewportChange={controller.handleViewportChange}
        onDrop={controller.handleDrop}
        onDragOver={controller.handleDragOver}
        onHideExplorer={controller.hideExplorerPanel}
        onShowExplorer={controller.showExplorerPanel}
        onHideInspector={controller.hideInspectorPanel}
        onShowInspector={controller.showInspectorPanel}
        onAutoLayout={controller.handleAutoLayout}
        onToggleCostOverlay={controller.handleToggleCostOverlay}
        onToggleImpact={controller.toggleImpactOverlay}
        onToggleColumns={controller.toggleColumnLevelLineage}
        onPlan={() => {
          void controller.handlePlan();
        }}
        onRun={() => {
          void controller.handleStartRun();
        }}
        canStartRun={controller.canStartRun}
        planStatusSummary={controller.planStatusSummary}
        exclusiveOverlayMode={controller.exclusiveOverlayMode}
        canUseCostOverlay={controller.canUseCostOverlay}
        impactOverlayEnabled={controller.impactOverlayEnabled}
        columnLevelLineageEnabled={controller.columnLevelLineageEnabled}
        transformationValidation={controller.transformationValidation}
        centerSurface={renderCenterSurface()}
        readOnlyBanner={<CanvasReadOnlyBannerView state={readOnlyState} />}
      />

      <PlanPreviewModal
        open={controller.planModalOpen}
        onClose={() => controller.setPlanModalOpen(false)}
        plan={controller.currentPlan as ExecutionPlan | null}
        startRunDisabled={!controller.canStartRun}
        startRunMessage={controller.planStatusSummary}
        onStartRun={() => {
          void controller.handleStartRun();
        }}
      />

      <ConfirmEdgeModal
        open={controller.confirmEdgeModal.open}
        onClose={() => controller.setConfirmEdgeModal({ open: false, edge: null })}
        edge={controller.confirmEdgeModal.edge}
        onConfirm={controller.confirmEdgeCreation}
      />
    </>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
