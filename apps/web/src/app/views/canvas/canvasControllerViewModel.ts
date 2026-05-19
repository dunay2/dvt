/** Owned concern: project Canvas controller state into a shell-ready view model. */
import { type NodeTypes } from '@xyflow/react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import type { CanvasGraphAuthoringMode } from '../../plugins/nodeTypeContracts';
import { getAllCanvasKinds, getRegisteredPluginIds } from '../../plugins/registry';
import type { CanvasRuntimePolicy } from './canvasRuntimePolicy';
import type { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import type { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import type { useCanvasExecutionActions } from './useCanvasExecutionActions';
import type { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
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
type CanvasInspectorCommands = ReturnType<typeof useCanvasInspectorCommands>;
type CanvasControllerGraphPolicy = {
  canvasAuthoringMode: CanvasGraphAuthoringMode;
  runtimePolicy: CanvasRuntimePolicy;
};

type CanvasControllerViewModelArgs = {
  environment: CanvasControllerEnvironment;
  authoringRuntime: CanvasAuthoringRuntime;
  persistence: CanvasLayoutPersistence;
  mutationHandlers: CanvasMutationHandlers;
  graphHandlers: CanvasGraphHandlers;
  overlayModel: CanvasOverlayModel;
  executionActions: CanvasExecutionActions;
  graphPolicy: CanvasControllerGraphPolicy;
  readModel: CanvasControllerReadModel;
  inspectorCommands: CanvasInspectorCommands;
};

function resolveCanvasGraphErrorMessage(authoringRuntime: CanvasAuthoringRuntime): string | null {
  const graphError = authoringRuntime.graphModel.graphAuthorityQuery.error;
  return graphError instanceof Error ? graphError.message : null;
}

function buildCanvasShellViewModel(args: CanvasControllerViewModelArgs) {
  const {
    environment: { dataSourceMode, capabilities, store },
    graphPolicy: { canvasAuthoringMode, runtimePolicy },
    authoringRuntime: { backendPosture, graphModel, draftReadModel, canCreateCanvasDocument },
    overlayModel,
    readModel: { nodesWithImpact, inspectorNode },
  } = args;

  return {
    dataSourceMode,
    workspaceScope: args.environment.sessionContext.getWorkspaceScopeSnapshot(),
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
    runtimeCapabilities: capabilities,
    availableCanvasKinds: getAllCanvasKinds(capabilities),
    canvasDocument: draftReadModel?.record?.draft.canvas ?? null,
    canCreateCanvasDocument,
    userPermissions: {
      ...store.userPermissions,
      canPlan: runtimePolicy.commands.canPlan,
      canRun: runtimePolicy.commands.canRun,
      canEditEdges: runtimePolicy.commands.canMutateGraph,
    },
    canvasAuthoringMode,
    canOpenSourceImport: runtimePolicy.commands.canOpenSourceImport,
    nodesWithImpact,
    edges: graphModel.edges,
    nodeTypes: canvasControllerNodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    canvasGridVisible: store.canvasGridVisible,
    canvasGridColor: store.canvasGridColor,
    canvasSnapToGrid: store.canvasSnapToGrid,
    viewport: store.persistedViewport,
    canEditInspectorNode: runtimePolicy.commands.canEditInspectorNode,
    applyInspectorNodeDraft: args.inspectorCommands.applyInspectorNodeDraft,
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
    onReconnect: graphHandlers.onReconnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDrag: persistence.handleNodeDrag,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
    handleCreateAuthoringNode: graphHandlers.handleCreateAuthoringNode,
    handleCreateCanvasDocument,
    handleExportProjectSnapshot: args.authoringRuntime.handleExportProjectSnapshot,
    handleImportProjectSnapshotFile: args.authoringRuntime.handleImportProjectSnapshotFile,
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
    setCanvasGridVisible: store.setCanvasGridVisible,
    setCanvasGridColor: store.setCanvasGridColor,
    setCanvasSnapToGrid: store.setCanvasSnapToGrid,
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
    executionActions,
    graphPolicy: { runtimePolicy },
    readModel: { transformationValidation },
  } = args;

  return {
    handlePlan: executionActions.handlePlan,
    handleStartRun: executionActions.handleStartRun,
    canStartRun: executionActions.canStartRun && runtimePolicy.commands.canRun,
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
      draftAuthTransportPosture,
      draftAccessPosture,
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
      canExportProjectSnapshot,
      canImportProjectSnapshot,
    },
  } = args;

  return {
    draftSaveStatus,
    draftAuthTransportPosture,
    draftAccessPosture,
    draftAccessMode,
    draftCapabilityReason,
    draftFormatError,
    draftFormatMeta,
    draftRecoveryReason,
    draftToolbarState,
    canExportProjectSnapshot,
    canImportProjectSnapshot,
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
