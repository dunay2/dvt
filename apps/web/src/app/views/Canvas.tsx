import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import { CanvasReadOnlyBannerView } from './canvas/CanvasStateViews';
import { renderCanvasCenterSurface } from './canvas/CanvasCenterSurface';
import { CanvasRecoveryBanner } from './canvas/CanvasRecoveryBanner';
import CanvasShell from './canvas/CanvasShell';
import {
  CANVAS_ROUTE_ID,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
  toRouteBootstrapPresentation,
} from './canvas/canvasDraftPresentationState';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { useCanvasController } from './canvas/useCanvasController';

function CanvasContent() {
  const controller = useCanvasController();
  const {
    draftTransportError,
    effectiveUserPermissions,
    readOnlyState,
    workbenchErrorMessage,
    presentationState,
    showRecoveryBanner,
  } = deriveCanvasRouteViewState(controller);

  usePublishedRouteBootstrap(
    CANVAS_ROUTE_ID,
    toRouteBootstrapPresentation(presentationState)
  );

  useEffect(() => {
    publishCanvasDraftPresentationState(presentationState);
  }, [
    presentationState.bootstrapDetail,
    presentationState.bootstrapStatus,
    presentationState.canCompleteBootstrap,
    presentationState.draftToolbarState.label,
    presentationState.draftToolbarState.showReloadAction,
    presentationState.draftToolbarState.tone,
    presentationState.recoveryReason,
    presentationState.routeState,
  ]);

  useEffect(() => {
    return () => {
      resetCanvasDraftPresentationState();
    };
  }, []);

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
        canvasPalette={controller.canvasPalette}
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
        onSourceImportComplete={controller.handleSourceImportComplete}
        importedNodeFocusIds={controller.importedNodeFocusIds}
        onImportedNodeFocusComplete={controller.handleImportedNodeFocusComplete}
        onHideExplorer={controller.hideExplorerPanel}
        onShowExplorer={controller.showExplorerPanel}
        onHideInspector={controller.hideInspectorPanel}
        onShowInspector={controller.showInspectorPanel}
        onAutoLayout={controller.handleAutoLayout}
        onToggleCostOverlay={controller.handleToggleCostOverlay}
        onToggleImpact={controller.toggleImpactOverlay}
        onToggleColumns={controller.toggleColumnLevelLineage}
        onReloadLatestDraft={controller.reloadLatestDraft}
        onPlan={() => {
          void controller.handlePlan();
        }}
        onRun={() => {
          void controller.handleStartRun();
        }}
        draftToolbarState={presentationState.draftToolbarState}
        canStartRun={controller.canStartRun}
        planStatusSummary={controller.planStatusSummary}
        exclusiveOverlayMode={controller.exclusiveOverlayMode}
        canUseCostOverlay={controller.canUseCostOverlay}
        impactOverlayEnabled={controller.impactOverlayEnabled}
        columnLevelLineageEnabled={controller.columnLevelLineageEnabled}
        transformationValidation={controller.transformationValidation}
        centerSurface={renderCanvasCenterSurface({
          controller,
          presentationState,
          draftTransportError,
          workbenchErrorMessage,
          canEditEdges: effectiveUserPermissions.canEditEdges,
        })}
        readOnlyBanner={
          <>
            <CanvasRecoveryBanner controller={controller} visible={showRecoveryBanner} />
            <CanvasReadOnlyBannerView state={readOnlyState} />
          </>
        }
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
