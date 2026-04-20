import { type NodeTypes } from '@xyflow/react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import { getRegisteredPluginIds } from '../../plugins/registry';
import { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasSelectionSync } from './useCanvasSelectionSync';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

export function useCanvasController() {
  const {
    dataSourceMode,
    capabilities,
    platformHealthQuery,
    graphStrategy,
    canvasAuthoringMode,
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
    workspaceBootstrapConfig,
    navigationActions,
    store,
  } = useCanvasControllerEnvironment();

  const {
    backendPosture,
    graphModel,
    draftSession,
    setDraftSession,
    draftSaveStatus,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
    visibleScope,
    uiScope,
    executionScope,
    isMissingRemoteDraft,
    isStaleDraftConflict,
    hasDraftProjectionGap,
    draftRecoveryReason,
    draftToolbarState,
    isDraftRecoveryBlocked,
    canMutateGraph,
  } = useCanvasAuthoringRuntime({
    dataSourceMode,
    platformHealthQuery: {
      isPending: platformHealthQuery.isPending,
      isError: platformHealthQuery.isError,
      data: platformHealthQuery.data,
      error: platformHealthQuery.error,
    },
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey: store.workspaceLayoutKey,
    graphStrategy,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
    selectedNodeIds: store.selectedNodeIds,
    inspectorNodeId: store.inspectorNodeId,
    canEditDraftTransport: store.userPermissions.canEditEdges,
    workspaceScope: sessionContext.getWorkspaceScopeSnapshot(),
    previewProvenanceConfig: workspaceBootstrapConfig,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  useCanvasSelectionSync({
    isBootstrapping: draftSession.syncState === 'bootstrapping',
    storeSelection: store.selectedNodeIds,
    storeInspectorNodeId: store.inspectorNodeId,
    uiScope,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
  });

  const persistence = useCanvasLayoutPersistence({
    hasHydrated: store._hasHydrated,
    isGraphQueryPending: graphModel.graphSnapshotQuery.isPending,
    workspaceLayoutKey: store.workspaceLayoutKey,
    persistedViewport: store.persistedViewport,
    setCanvasViewport: store.setCanvasViewport,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  const mutationHandlers = useCanvasMutationHandlers({
    canMutateGraph,
    workspaceLayoutKey: store.workspaceLayoutKey,
    graphModel,
    draftSession,
    uiScope,
    selectedNodeIds: store.selectedNodeIds,
    setDraftSession,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
    showInspectorPanel: store.showInspectorPanel,
    setCurrentPlan: store.setCurrentPlan,
  });

  const graphHandlers = useCanvasGraphHandlers({
    graphStrategy,
    canonicalNodesById: graphModel.canonicalNodesById,
    edges: graphModel.edges,
    nodes: graphModel.nodes,
    selectedNodeIds: uiScope.selectedNodeIds,
    inspectorNodeId: uiScope.inspectorNodeId,
    draftSession,
    canEditEdges: canMutateGraph,
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    setNodes: graphModel.setNodes,
    setEdges: graphModel.setEdges,
    setDraftSession,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
    toggleInspectorPanel: store.toggleInspectorPanel,
    onLayoutComplete: persistence.handleNodePositionsSave,
  });

  const overlayModel = useCanvasOverlayModel({
    canonicalNodes: graphModel.canonicalNodes,
    currentRun: store.currentRun,
    capabilities,
    edges: graphModel.edges,
    selectedNodeIds: uiScope.selectedNodeIds,
  });

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceService,
    canonicalNodes: visibleScope.canonicalNodes,
    canonicalEdges: visibleScope.canonicalEdges,
    selectedNodeIds: executionScope.selectedNodeIds,
    workspaceNodeIds: executionScope.workspaceNodeIds,
    canPlan: store.userPermissions.canPlan && !isDraftRecoveryBlocked,
    canRun: store.userPermissions.canRun && !isDraftRecoveryBlocked,
    sessionContext,
    shellFeedback,
    previewProvenanceConfig: workspaceBootstrapConfig,
    consolePanelVisible: store.consolePanelVisible,
    currentPlan: store.currentPlan,
    setCurrentPlan: store.setCurrentPlan,
    setConsolePanelHeight: store.setConsolePanelHeight,
    toggleConsolePanel: store.toggleConsolePanel,
    onRunStarted: navigationActions.handleRunStarted,
  });

  const { transformationValidation, nodesWithImpact, inspectorNode } =
    useCanvasControllerReadModel({
      graphModel,
      visibleScope,
      executionScope,
      uiScope,
      overlayModel,
      graphHandlers,
      canMutateGraph,
      columnLevelLineageEnabled: store.columnLevelLineageEnabled,
      impactOverlayEnabled: store.impactOverlayEnabled,
    });

  return {
    dataSourceMode,
    isBackendCheckPending: backendPosture.isBackendCheckPending,
    backendReady: backendPosture.backendReady,
    backendBlockMessage: backendPosture.backendBlockMessage,
    isLoadingGraph: graphModel.graphSnapshotQuery.isPending,
    graphErrorMessage:
      graphModel.graphSnapshotQuery.error instanceof Error
        ? graphModel.graphSnapshotQuery.error.message
        : null,
    focusMode: store.focusMode,
    explorerPanelVisible: store.explorerPanelVisible,
    inspectorPanelVisible: store.inspectorPanelVisible,
    explorerNodes: graphModel.canonicalNodes,
    inspectorNode,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    userPermissions: store.userPermissions,
    canvasAuthoringMode,
    nodesWithImpact,
    edges: graphModel.edges,
    nodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    viewport: store.persistedViewport,
    onNodesChange: mutationHandlers.handleNodesChange,
    onEdgesChange: mutationHandlers.handleEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
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
    handlePlan: executionActions.handlePlan,
    handleStartRun: executionActions.handleStartRun,
    canStartRun: executionActions.canStartRun && !isDraftRecoveryBlocked,
    planStatusSummary: executionActions.planStatusSummary,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    draftSaveStatus,
    draftRecoveryReason,
    draftToolbarState,
    draftConflictRevision:
      draftSession.syncState === 'conflict' ? draftSession.draftRevision : null,
    hasStaleDraftVersion: isStaleDraftConflict,
    hasMissingRemoteDraft: isMissingRemoteDraft,
    hasDraftProjectionGap,
    reloadLatestDraft,
    adoptCurrentWorkspaceSnapshot,
    currentPlan: store.currentPlan,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}
