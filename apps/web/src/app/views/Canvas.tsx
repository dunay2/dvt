import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import { Button } from '../components/ui/button';
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
import {
  deriveCanvasDraftPresentationState,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
  toRouteBootstrapPresentation,
} from './canvas/canvasDraftPresentationState';
import { useCanvasController } from './canvas/useCanvasController';

function CanvasContent() {
  const controller = useCanvasController();
  const workbenchState = getCanvasWorkbenchState({
    canonicalNodeCount: controller.explorerNodes.length,
    isLoadingGraph: controller.isLoadingGraph,
    graphErrorMessage: controller.graphErrorMessage,
  });
  const shouldBlockCanvasInApiMode = controller.dataSourceMode === 'api' && !controller.backendReady;
  const shouldDisableCanvasInteractions =
    shouldBlockCanvasInApiMode ||
    controller.isBackendCheckPending ||
    controller.draftRecoveryReason != null;
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
  const workbenchErrorMessage =
    workbenchState.kind === 'error' ? workbenchState.message : null;
  const presentationState = deriveCanvasDraftPresentationState({
    isBackendCheckPending: controller.isBackendCheckPending,
    shouldBlockCanvasInApiMode,
    backendBlockMessage: controller.backendBlockMessage,
    workbenchState,
    recoveryReason: controller.draftRecoveryReason,
    draftToolbarState: controller.draftToolbarState,
  });
  const showRecoveryBanner = presentationState.routeState === 'recovery';
  const staleDraftBanner =
    showRecoveryBanner && controller.draftRecoveryReason === 'stale_conflict' ? (
    <div
      data-slot="canvas-stale-draft-state"
      className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{canvasViewCopy.staleDraftTitle}</p>
          <p className="text-amber-200">{canvasViewCopy.staleDraftMessage}</p>
        </div>
        <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
          Reload latest draft
        </Button>
      </div>
    </div>
  ) : null;
  const missingRemoteDraftBanner =
    showRecoveryBanner && controller.draftRecoveryReason === 'missing_remote' ? (
    <div
      data-slot="canvas-missing-remote-draft-state"
      className="border-b border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{canvasViewCopy.missingRemoteDraftTitle}</p>
          <p className="text-rose-200">{canvasViewCopy.missingRemoteDraftMessage}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
            {canvasViewCopy.reloadLatestDraftLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={controller.adoptCurrentWorkspaceSnapshot}>
            {canvasViewCopy.adoptCurrentWorkspaceSnapshotLabel}
          </Button>
        </div>
      </div>
    </div>
  ) : null;
  const draftProjectionGapBanner =
    showRecoveryBanner && controller.draftRecoveryReason === 'projection_gap' ? (
      <div
        data-slot="canvas-draft-projection-gap-state"
        className="border-b border-sky-500/40 bg-sky-950/40 px-4 py-3 text-sm text-sky-100"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{canvasViewCopy.draftProjectionGapTitle}</p>
            <p className="text-sky-200">{canvasViewCopy.draftProjectionGapMessage}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={controller.reloadLatestDraft}>
              {canvasViewCopy.reloadLatestDraftLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={controller.adoptCurrentWorkspaceSnapshot}
            >
              {canvasViewCopy.adoptCurrentWorkspaceSnapshotLabel}
            </Button>
          </div>
        </div>
      </div>
    ) : null;

  usePublishedRouteBootstrap(toRouteBootstrapPresentation(presentationState));

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

  function renderCenterSurface() {
    switch (presentationState.routeState) {
      case 'loading_backend':
        return (
          <CanvasLoadingStateView
            title={canvasViewCopy.backendLoadingTitle}
            message={canvasViewCopy.backendLoadingMessage}
          />
        );
      case 'blocked_backend':
        return (
          <CanvasBlockedStateView
            message={controller.backendBlockMessage ?? canvasViewCopy.backendBlockedFallbackMessage}
          />
        );
      case 'loading_graph':
        return <CanvasLoadingStateView />;
      case 'error_graph':
        return (
          <CanvasErrorStateView
            message={workbenchErrorMessage || canvasViewCopy.routeErrorFallbackMessage}
          />
        );
      case 'recovery':
        return undefined;
      case 'empty':
        return (
          <CanvasEmptyStateView
            message={
              effectiveUserPermissions.canEditEdges
                ? canvasViewCopy.routeEmptyEditableMessage
                : canvasViewCopy.routeEmptyReadOnlyMessage
            }
          />
        );
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
        centerSurface={renderCenterSurface()}
        readOnlyBanner={
          <>
            {staleDraftBanner}
            {draftProjectionGapBanner}
            {missingRemoteDraftBanner}
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
