import { type NodeTypes } from '@xyflow/react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import { getAllCanvasKinds, getRegisteredPluginIds } from '../../plugins/registry';
import type { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import type { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import type { useCanvasExecutionActions } from './useCanvasExecutionActions';
import type { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import type { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import type { useCanvasOverlayModel } from './useCanvasOverlayModel';

const canvasControllerNodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

type CanvasControllerEnvironment = ReturnType<typeof useCanvasControllerEnvironment>;
type CanvasAuthoringRuntime = ReturnType<typeof useCanvasAuthoringRuntime>;
type CanvasLayoutPersistence = ReturnType<typeof useCanvasLayoutPersistence>;
type CanvasMutationHandlers = ReturnType<typeof useCanvasMutationHandlers>;
type CanvasGraphHandlers = ReturnType<typeof useCanvasGraphHandlers>;
type CanvasOverlayModel = ReturnType<typeof useCanvasOverlayModel>;
type CanvasExecutionActions = ReturnType<typeof useCanvasExecutionActions>;
type CanvasControllerReadModel = ReturnType<typeof useCanvasControllerReadModel>;

type CanvasControllerViewModelArgs = {
  environment: CanvasControllerEnvironment;
  authoringRuntime: CanvasAuthoringRuntime;
  persistence: CanvasLayoutPersistence;
  mutationHandlers: CanvasMutationHandlers;
  graphHandlers: CanvasGraphHandlers;
  overlayModel: CanvasOverlayModel;
  executionActions: CanvasExecutionActions;
  readModel: CanvasControllerReadModel;
};

function resolveCanvasGraphErrorMessage(authoringRuntime: CanvasAuthoringRuntime): string | null {
  const graphError = authoringRuntime.graphModel.graphAuthorityQuery.error;
  return graphError instanceof Error ? graphError.message : null;
}

function buildCanvasShellViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: {
      dataSourceMode,
      capabilities,
      canvasAuthoringMode,
      workspaceServiceCapabilities,
      store,
    },
    authoringRuntime: { backendPosture, graphModel, draftReadModel },
    overlayModel,
    readModel: { nodesWithImpact, inspectorNode },
  } = args;

  return {
    dataSourceMode,
    isBackendCheckPending: backendPosture.isBackendCheckPending,
    backendReady: backendPosture.backendReady,
    backendBlockMessage: backendPosture.backendBlockMessage,
    isLoadingGraph: graphModel.graphAuthorityQuery.isPending,
    graphErrorMessage: resolveCanvasGraphErrorMessage(args.authoringRuntime),
    focusMode: store.focusMode,
    explorerPanelVisible: store.explorerPanelVisible,
    inspectorPanelVisible: store.inspectorPanelVisible,
    explorerNodes: graphModel.canonicalNodes,
    inspectorNode,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    availableCanvasKinds: getAllCanvasKinds(capabilities),
    canvasDocument: draftReadModel?.record?.draft.canvas ?? null,
    userPermissions: store.userPermissions,
    canvasAuthoringMode,
    canOpenSourceImport: workspaceServiceCapabilities.sourceImportAvailable,
    nodesWithImpact,
    edges: graphModel.edges,
    nodeTypes: canvasControllerNodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    viewport: store.persistedViewport,
  };
}

function buildCanvasInteractionViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { store },
    persistence,
    mutationHandlers,
    graphHandlers,
    overlayModel,
    authoringRuntime: { handleCreateCanvasDocument },
  } = args;

  return {
    onNodesChange: mutationHandlers.handleNodesChange,
    onEdgesChange: mutationHandlers.handleEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
    handleCreateAuthoringNode: graphHandlers.handleCreateAuthoringNode,
    handleCreateCanvasDocument,
    handleSourceImportComplete: mutationHandlers.handleSourceImportComplete,
    importedNodeFocusIds: mutationHandlers.importedNodeFocusIds,
    handleImportedNodeFocusComplete: mutationHandlers.handleImportedNodeFocusComplete,
    hideExplorerPanel: store.hideExplorerPanel,
    showExplorerPanel: store.showExplorerPanel,
    hideInspectorPanel: store.hideInspectorPanel,
    showInspectorPanel: store.showInspectorPanel,
    handleAutoLayout: graphHandlers.handleAutoLayout,
    handleToggleCostOverlay: overlayModel.handleToggleCostOverlay,
    toggleImpactOverlay: store.toggleImpactOverlay,
    toggleColumnLevelLineage: store.toggleColumnLevelLineage,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}

function buildCanvasExecutionViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { store },
    authoringRuntime: { isDraftRecoveryBlocked },
    executionActions,
    readModel: { transformationValidation },
  } = args;

  return {
    handlePlan: executionActions.handlePlan,
    handleStartRun: executionActions.handleStartRun,
    canStartRun: executionActions.canStartRun && !isDraftRecoveryBlocked,
    planStatusSummary: executionActions.planStatusSummary,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    currentPlan: store.currentPlan,
  };
}

function buildCanvasDraftViewModel(args: CanvasControllerViewModelArgs) {
  const {
    authoringRuntime: {
      draftSession,
      draftSaveStatus,
      draftAccessMode,
      draftCapabilityReason,
      draftFormatError,
      draftFormatMeta,
      reloadLatestDraft,
      isMissingRemoteDraft,
      isStaleDraftConflict,
      hasDraftProjectionGap,
      draftRecoveryReason,
      draftToolbarState,
    },
  } = args;

  return {
    draftSaveStatus,
    draftAccessMode,
    draftCapabilityReason,
    draftFormatError,
    draftFormatMeta,
    draftRecoveryReason,
    draftToolbarState,
    draftConflictRevision:
      draftSession.syncState === 'conflict' ? draftSession.draftRevision : null,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasDraftProjectionGap,
    reloadLatestDraft,
  };
}

export function buildCanvasControllerViewModel(args: CanvasControllerViewModelArgs) {
  return {
    ...buildCanvasShellViewModel(args),
    ...buildCanvasInteractionViewModel(args),
    ...buildCanvasExecutionViewModel(args),
    ...buildCanvasDraftViewModel(args),
  };
}
