/** Owned concern: compose Canvas environment, authoring runtime, adapter seams, and execution seams into one route facade. */
import { buildCanvasControllerViewModel } from './canvasControllerViewModel';
import { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasSelectionSync } from './useCanvasSelectionSync';

export function useCanvasController() {
  const environment = useCanvasControllerEnvironment();
  const {
    dataSourceMode,
    capabilities,
    platformHealthQuery,
    graphStrategy,
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
    workspaceBootstrapConfig,
    navigationActions,
    store,
  } = environment;

  const authoringRuntime = useCanvasAuthoringRuntime({
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
  const {
    graphModel,
    draftSession,
    setDraftSession,
    visibleScope,
    uiScope,
    executionScope,
    isDraftRecoveryBlocked,
    canMutateGraph,
  } = authoringRuntime;

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
    isGraphQueryPending: graphModel.graphAuthorityQuery.isPending,
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

  const { transformationValidation, nodesWithImpact, inspectorNode } = useCanvasControllerReadModel(
    {
      graphModel,
      visibleScope,
      executionScope,
      uiScope,
      overlayModel,
      graphHandlers,
      canMutateGraph,
      columnLevelLineageEnabled: store.columnLevelLineageEnabled,
      impactOverlayEnabled: store.impactOverlayEnabled,
    }
  );

  return buildCanvasControllerViewModel({
    environment,
    authoringRuntime,
    persistence,
    mutationHandlers,
    graphHandlers,
    overlayModel,
    executionActions,
    readModel: {
      transformationValidation,
      nodesWithImpact,
      inspectorNode,
    },
  });
}
