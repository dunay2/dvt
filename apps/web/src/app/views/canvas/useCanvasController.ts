/** Owned concern: compose Canvas environment, authoring runtime, adapter seams, and execution seams into one route facade. */
import { useCallback, useMemo } from 'react';

import {
  resolveActiveCanvasAuthoringMode,
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
  selectActiveCanvasSurfaceStrategy,
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
import { applyDbtExecutionSelectionToggle } from './dbtExecutionScopePolicy';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

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
    frozenNodeIds: store.frozenNodeIds,
    selectionIntent: store.executionSelectionIntent,
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
  const surfaceStrategy = selectActiveCanvasSurfaceStrategy(activeCanvasGraphStrategyResolution);
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
      canReloadLatestDraft: authoringRuntime.draftStatusState.showReloadAction,
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
    authoringRuntime.draftStatusState.showReloadAction,
    canMutateGraph,
    draftAccessPosture,
    isDraftRecoveryBlocked,
    store.userPermissions.canPlan,
    store.userPermissions.canRun,
    workspacePortCapabilities.sourceImportAvailable,
  ]);
  const canMutateActiveCanvas = runtimePolicy.commands.canMutateGraph;
  const canSelectExecution = runtimePolicy.commands.canPlan || runtimePolicy.commands.canRun;
  const preservesDbtExecutionSelectionIntent = canvasAuthoringMode === 'dbt';
  const setSelectedNodesForActiveCanvas = useCallback(
    (nodeIds: string[]) => {
      if (preservesDbtExecutionSelectionIntent) {
        store.setExecutionSelectionIntent(
          createCanvasExecutionSelectionIntent(nodeIds, 'explicit')
        );
        return;
      }

      store.setSelectedNodes(nodeIds);
    },
    [
      preservesDbtExecutionSelectionIntent,
      store.setExecutionSelectionIntent,
      store.setSelectedNodes,
    ]
  );

  useCanvasSelectionSync({
    isBootstrapping: draftSession.syncState === 'bootstrapping',
    preserveSelectionIntent: preservesDbtExecutionSelectionIntent,
    storeSelection: store.selectedNodeIds,
    storeInspectorNodeId: store.inspectorNodeId,
    uiScope,
    setSelectedNodes: setSelectedNodesForActiveCanvas,
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
    setSelectedNodes: setSelectedNodesForActiveCanvas,
    setInspectorNode: store.setInspectorNode,
    showInspectorPanel: store.showInspectorPanel,
    setCurrentPlan: store.setCurrentPlan,
    onLayoutComplete: persistence.handleNodePositionsSave,
    invalidateInFlightSaveAttempt: authoringRuntime.invalidateInFlightSaveAttempt,
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
    setSelectedNodes: setSelectedNodesForActiveCanvas,
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

  const handleToggleExecutionSelection = useCallback(
    (nodeId: string, shouldSelect: boolean) => {
      if (!preservesDbtExecutionSelectionIntent) {
        graphHandlers.handleToggleNodeSelection(nodeId, shouldSelect);
        return;
      }

      store.setExecutionSelectionIntent(
        applyDbtExecutionSelectionToggle({
          requestedNodeIds: executionScope.requestedNodeIds,
          visibleNodeIds: executionScope.workspaceNodeIds,
          nodeId,
          shouldSelect,
        })
      );
    },
    [
      executionScope.requestedNodeIds,
      executionScope.workspaceNodeIds,
      graphHandlers.handleToggleNodeSelection,
      preservesDbtExecutionSelectionIntent,
      store.setExecutionSelectionIntent,
    ]
  );

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    executionStrategy,
    canonicalNodes: visibleScope.canonicalNodes,
    canonicalEdges: visibleScope.canonicalEdges,
    selectionIntent: createCanvasExecutionSelectionIntent(
      preservesDbtExecutionSelectionIntent
        ? executionScope.requestedNodeIds
        : executionScope.selectedNodeIds,
      executionScope.selectionMode
    ),
    workspaceNodeIds: executionScope.workspaceNodeIds,
    flushDraftForExecution: authoringRuntime.flushDraftForExecution,
    canPlan: runtimePolicy.commands.canPlan,
    canRun: runtimePolicy.commands.canRun,
    sessionContext,
    executionEnvironmentId: draftReadModel?.record?.draft.canvas.environmentId,
    shellFeedback,
    previewProvenanceConfig: workspaceBootstrapConfig,
    bottomDrawerVisible: store.bottomDrawerVisible,
    currentPlan: store.currentPlan,
    setCurrentPlan: store.setCurrentPlan,
    setBottomDrawerHeight: store.setBottomDrawerHeight,
    toggleBottomDrawer: store.toggleBottomDrawer,
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
      onToggleExecutionSelection: handleToggleExecutionSelection,
      activeCanvasKind: canvasAuthoringMode,
      runtimeCapabilities: capabilities,
      canMutateGraph: canMutateActiveCanvas,
      canSelectExecution,
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
      surfaceStrategy,
    },
    readModel: {
      transformationValidation,
      nodesWithImpact,
      inspectorNode,
    },
    inspectorCommands,
  });
}
