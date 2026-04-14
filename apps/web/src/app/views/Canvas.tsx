import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import {
  completeBootstrapScreen,
  setBootstrapStepStatus,
} from '../bootstrap/appBootstrapScreen';
import {
  CanvasBlockedStateView,
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
  const shouldBlockCanvasInApiMode = controller.dataSourceMode === 'api' && !controller.backendReady;
  const shouldDisableCanvasInteractions = shouldBlockCanvasInApiMode || controller.isBackendCheckPending;
  const isCanvasRuntimeBlocked = shouldDisableCanvasInteractions;
  const effectiveUserPermissions = shouldDisableCanvasInteractions
    ? {
        ...controller.userPermissions,
        canPlan: false,
        canRun: false,
        canEditEdges: false,
      }
    : controller.userPermissions;
  const readOnlyState = isCanvasRuntimeBlocked
    ? null
    : getCanvasReadOnlyState(effectiveUserPermissions);
  const isCanvasStartupPending =
    controller.isBackendCheckPending || workbenchState.kind === 'loading';
  const workbenchErrorMessage =
    workbenchState.kind === 'error' ? workbenchState.message : null;

  useEffect(() => {
    if (isCanvasStartupPending) {
      setBootstrapStepStatus(
        'route',
        'pending',
        controller.isBackendCheckPending
          ? 'Checking backend readiness for canvas'
          : 'Loading workspace graph for canvas'
      );
      return;
    }

    if (workbenchState.kind === 'error') {
      setBootstrapStepStatus(
        'route',
        'error',
        workbenchErrorMessage || canvasViewCopy.routeErrorFallbackMessage
      );
      completeBootstrapScreen();
      return;
    }

    if (shouldBlockCanvasInApiMode) {
      setBootstrapStepStatus(
        'route',
        'complete',
        controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage
      );
      completeBootstrapScreen();
      return;
    }

    setBootstrapStepStatus(
      'route',
      'complete',
      workbenchState.kind === 'empty' ? 'Canvas is ready with no graph content yet' : 'Canvas is ready'
    );
    completeBootstrapScreen();
  }, [
    controller.backendBlockMessage,
    controller.isBackendCheckPending,
    isCanvasStartupPending,
    shouldBlockCanvasInApiMode,
    workbenchErrorMessage,
    workbenchState.kind,
  ]);

  function renderCenterSurface() {
    if (controller.dataSourceMode === 'api' && controller.isBackendCheckPending) {
      return (
        <CanvasLoadingStateView
          title={canvasViewCopy.backendLoadingTitle}
          message={canvasViewCopy.backendLoadingMessage}
        />
      );
    }

    if (shouldBlockCanvasInApiMode) {
      return (
        <CanvasBlockedStateView
          message={controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage}
        />
      );
    }

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
        userPermissions={effectiveUserPermissions}
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
        plan={controller.currentPlan}
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
