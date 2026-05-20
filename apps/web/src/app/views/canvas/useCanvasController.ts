/** Owned concern: compose Canvas environment, authoring runtime, adapter seams, and execution seams into one route facade. */
import { useMemo } from 'react';

import {
  resolveActiveCanvasAuthoringMode,
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
} from './canvasActiveGraphStrategy';
import { buildCanvasControllerViewModel } from './canvasControllerViewModel';
import { applyCanvasDraftPostureToRuntimePolicyInput } from './canvasDraftAccessPostureModel';
import { resolveCanvasRuntimePolicy } from './canvasRuntimePolicy';
import { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import { useCanvasSelectionSync } from './useCanvasSelectionSync';

export function useCanvasController() {
  const environment = useCanvasControllerEnvironment();
  const {
    dataSourceMode,
    capabilities,
    platformHealthQuery,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    workspacePortCapabilities,
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
      failureCount: platformHealthQuery.failureCount,
      errorUpdatedAt: platformHealthQuery.errorUpdatedAt,
    },
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey: store.workspaceLayoutKey,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
    selectedNodeIds: store.selectedNodeIds,
    inspectorNodeId: store.inspectorNodeId,
    canPersistGraphDraftTransport: store.userPermissions.canPersistGraphDraft,
    canMutateGraphTransport: store.userPermissions.canEditEdges,
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
    draftReadModel,
    draftAccessPosture,
  } = authoringRuntime;
  const activeCanvasGraphStrategyResolution = useMemo(
    () => resolveActiveCanvasGraphStrategy(draftReadModel, capabilities),
    [capabilities, draftReadModel?.record?.draft.canvas.kind]
  );
  const graphStrategy = selectActiveCanvasGraphStrategy(activeCanvasGraphStrategyResolution);
  const executionStrategy = selectActiveCanvasExecutionStrategy(
    activeCanvasGraphStrategyResolution
  );
  const canvasAuthoringMode = useMemo(
    () => resolveActiveCanvasAuthoringMode(draftReadModel),
    [draftReadModel?.record?.draft.canvas.kind]
  );
  const runtimePolicy = useMemo(() => {
    const draftAdmission = applyCanvasDraftPostureToRuntimePolicyInput({
      posture: draftAccessPosture,
      canMutateGraph,
      canPlan: store.userPermissions.canPlan && !isDraftRecoveryBlocked,
      canRun: store.userPermissions.canRun && !isDraftRecoveryBlocked,
      canReloadLatestDraft: authoringRuntime.draftToolbarState.showReloadAction,
    });

    return resolveCanvasRuntimePolicy({
      activeRuntime: activeCanvasGraphStrategyResolution,
      canMutateGraph: draftAdmission.canMutateGraph,
      canOpenSourceImport: workspacePortCapabilities.sourceImportAvailable,
      canPlan: draftAdmission.canPlan,
      canRun: draftAdmission.canRun,
      canReloadLatestDraft: draftAdmission.canReloadLatestDraft,
    });
  }, [
    activeCanvasGraphStrategyResolution,
    authoringRuntime.draftToolbarState.showReloadAction,
    canMutateGraph,
    draftAccessPosture,
    isDraftRecoveryBlocked,
    store.userPermissions.canPlan,
    store.userPermissions.canRun,
    workspacePortCapabilities.sourceImportAvailable,
  ]);
  const canMutateActiveCanvas = runtimePolicy.commands.canMutateGraph;

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
    nodes: graphModel.nodes,
    persistedViewport: store.persistedViewport,
    persistedNodePositions: store.persistedNodePositions,
    setCanvasViewport: store.setCanvasViewport,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  const mutationHandlers = useCanvasMutationHandlers({
    canMutateGraph: canMutateActiveCanvas,
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
    onLayoutComplete: persistence.handleNodePositionsSave,
  });

  const graphHandlers = useCanvasGraphHandlers({
    graphStrategy,
    canonicalNodesById: graphModel.canonicalNodesById,
    edges: graphModel.edges,
    nodes: graphModel.nodes,
    selectedNodeIds: uiScope.selectedNodeIds,
    inspectorNodeId: uiScope.inspectorNodeId,
    draftSession,
    canEditEdges: canMutateActiveCanvas,
    gridSize: store.gridSize,
    canvasSnapToGrid: store.canvasSnapToGrid,
    runtimeCapabilities: capabilities,
    allowsCanonicalNode: runtimePolicy.admission.allowsCanonicalNode,
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
    workspaceFilesQuery,
    workspaceFileContentCommand,
    executionStrategy,
    canonicalNodes: visibleScope.canonicalNodes,
    canonicalEdges: visibleScope.canonicalEdges,
    selectedNodeIds: executionScope.selectedNodeIds,
    workspaceNodeIds: executionScope.workspaceNodeIds,
    canPlan: runtimePolicy.commands.canPlan,
    canRun: runtimePolicy.commands.canRun,
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
      runtimeCapabilities: capabilities,
      canMutateGraph: canMutateActiveCanvas,
      columnLevelLineageEnabled: store.columnLevelLineageEnabled,
      impactOverlayEnabled: store.impactOverlayEnabled,
    }
  );
  const inspectorCommands = useCanvasInspectorCommands({
    inspectorNode,
    setDraftSession,
  });

  return buildCanvasControllerViewModel({
    environment,
    authoringRuntime,
    persistence,
    mutationHandlers,
    graphHandlers,
    overlayModel,
    executionActions,
    graphPolicy: {
      canvasAuthoringMode,
      runtimePolicy,
    },
    readModel: {
      transformationValidation,
      nodesWithImpact,
      inspectorNode,
    },
    inspectorCommands,
  });
}
