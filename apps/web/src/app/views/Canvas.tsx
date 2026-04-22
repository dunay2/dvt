/**
 * Owned concern: route composition for the governed Canvas shell.
 */

import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import { CanvasReadOnlyBannerView } from './canvas/CanvasStateViews';
import { renderCanvasCenterSurface } from './canvas/CanvasCenterSurface';
import { CanvasRecoveryBanner } from './canvas/CanvasRecoveryBanner';
import CanvasShell from './canvas/CanvasShell';
import { toRouteBootstrapPresentation } from './canvas/canvasDraftPresentationModel';
import {
  CANVAS_ROUTE_ID,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvas/canvasDraftPresentationStore';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { useCanvasController } from './canvas/useCanvasController';

type CanvasController = ReturnType<typeof useCanvasController>;
type CanvasRouteViewState = ReturnType<typeof deriveCanvasRouteViewState>;
type CanvasShellComponentProps = ComponentProps<typeof CanvasShell>;
type CanvasRouteSurfaceProps = Readonly<{
  controller: CanvasController;
  routeViewState: CanvasRouteViewState;
}>;
type CanvasModalLayerProps = Readonly<{
  controller: CanvasController;
}>;

function useCanvasPresentationLifecycle(
  presentationState: CanvasRouteViewState['presentationState']
): void {
  usePublishedRouteBootstrap(CANVAS_ROUTE_ID, toRouteBootstrapPresentation(presentationState));

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
}

function buildCanvasReadOnlyBanner({
  controller,
  routeViewState,
}: CanvasRouteSurfaceProps): ReactNode {
  return (
    <>
      <CanvasRecoveryBanner controller={controller} visible={routeViewState.showRecoveryBanner} />
      <CanvasReadOnlyBannerView state={routeViewState.readOnlyState} />
    </>
  );
}

function buildCanvasShellProps(args: CanvasRouteSurfaceProps): CanvasShellComponentProps {
  const { controller, routeViewState } = args;
  const {
    draftTransportError,
    startupBlockState,
    effectiveUserPermissions,
    workbenchErrorMessage,
    presentationState,
  } = routeViewState;

  return {
    layout: {
      focusMode: controller.focusMode,
      explorerPanelVisible: controller.explorerPanelVisible,
      inspectorPanelVisible: controller.inspectorPanelVisible,
      canOpenSourceImport: controller.canOpenSourceImport,
    },
    panels: {
      explorerNodes: controller.explorerNodes,
      inspectorNode: controller.inspectorNode,
      activeRunId: controller.activeRunId,
      registeredPlugins: controller.registeredPlugins,
      userPermissions: effectiveUserPermissions,
    },
    graph: {
      canvasAuthoringMode: controller.canvasAuthoringMode,
      nodesWithImpact: controller.nodesWithImpact,
      edges: controller.edges,
      nodeTypes: controller.nodeTypes,
      gridSize: controller.gridSize,
      canvasPalette: controller.canvasPalette,
      viewport: controller.viewport,
    },
    graphCommands: {
      onNodesChange: controller.onNodesChange,
      onNodeDragStop: controller.handleNodeDragStop,
      onEdgesChange: controller.onEdgesChange,
      onConnect: controller.onConnect,
      onNodeClick: controller.handleNodeClick,
      onSelectionChange: controller.onSelectionChange,
      onViewportChange: controller.handleViewportChange,
      onDrop: controller.handleDrop,
      onDragOver: controller.handleDragOver,
      onSourceImportComplete: controller.handleSourceImportComplete,
      importedNodeFocusIds: controller.importedNodeFocusIds,
      onImportedNodeFocusComplete: controller.handleImportedNodeFocusComplete,
    },
    chromeCommands: {
      onHideExplorer: controller.hideExplorerPanel,
      onShowExplorer: controller.showExplorerPanel,
      onHideInspector: controller.hideInspectorPanel,
      onShowInspector: controller.showInspectorPanel,
    },
    toolbar: {
      onAutoLayout: controller.handleAutoLayout,
      onToggleCostOverlay: controller.handleToggleCostOverlay,
      onToggleImpact: controller.toggleImpactOverlay,
      onToggleColumns: controller.toggleColumnLevelLineage,
      onReloadLatestDraft: controller.reloadLatestDraft,
      onPlan: () => {
        void controller.handlePlan();
      },
      onRun: () => {
        void controller.handleStartRun();
      },
      draftToolbarState: presentationState.draftToolbarState,
      canStartRun: controller.canStartRun,
      planStatusSummary: controller.planStatusSummary,
      exclusiveOverlayMode: controller.exclusiveOverlayMode,
      canUseCostOverlay: controller.canUseCostOverlay,
      impactOverlayEnabled: controller.impactOverlayEnabled,
      columnLevelLineageEnabled: controller.columnLevelLineageEnabled,
      transformationValidation: controller.transformationValidation,
    },
    centerSurface: renderCanvasCenterSurface({
      presentationState,
      startupBlockState,
      draftTransportError,
      workbenchErrorMessage,
      canEditEdges: effectiveUserPermissions.canEditEdges,
      canOpenSourceImport: controller.canOpenSourceImport,
    }),
    readOnlyBanner: buildCanvasReadOnlyBanner(args),
  };
}

function CanvasShellSurface(args: CanvasRouteSurfaceProps): JSX.Element {
  return <CanvasShell {...buildCanvasShellProps(args)} />;
}

function CanvasModalLayer({ controller }: CanvasModalLayerProps): JSX.Element {
  return (
    <>
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

function CanvasContent() {
  const controller = useCanvasController();
  const routeViewState = deriveCanvasRouteViewState(controller);

  useCanvasPresentationLifecycle(routeViewState.presentationState);

  return (
    <>
      <CanvasShellSurface controller={controller} routeViewState={routeViewState} />
      <CanvasModalLayer controller={controller} />
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
