/** Owned concern: compose Canvas environment, authoring runtime, adapter seams, and execution seams into one route facade. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
  selectActiveCanvasSurfaceStrategy,
} from './canvasActiveGraphStrategy';
import { buildCanvasControllerViewModel } from './canvasControllerViewModel';
import { applyCanvasDraftPostureToRuntimePolicyInput } from './canvasDraftAccessPostureModel';
import { resolveGraphDraftAuthoringCanvasId } from './canvasDraftReadModel';
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
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

export function useCanvasController() {
  const environment = useCanvasControllerEnvironment();
  const {
    capabilities,
    platformHealthQuery,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    hasAuthorizedSourceImportContribution,
    workspaceGraphDraftAuthoringPort,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
    workspaceBootstrapConfig,
    navigationActions,
    store,
  } = environment;
  const workspaceScope = sessionContext.getWorkspaceScopeSnapshot();
  const previousWorkspaceLayoutKeyRef = useRef(store.workspaceLayoutKey);
  const [impactFocusNodeId, setImpactFocusNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (previousWorkspaceLayoutKeyRef.current === store.workspaceLayoutKey) {
      return;
    }

    previousWorkspaceLayoutKeyRef.current = store.workspaceLayoutKey;
    setImpactFocusNodeId(null);
    store.setExecutionSelectionIntent(createCanvasExecutionSelectionIntent([]));
    store.setInspectorNode(null);
    store.closeContextualWorkbench();
    store.setCurrentPlan(null);
    store.setCurrentRun(null);
  }, [
    store.closeContextualWorkbench,
    store.setCurrentPlan,
    store.setCurrentRun,
    store.setExecutionSelectionIntent,
    store.setInspectorNode,
    store.workspaceLayoutKey,
  ]);

  const authoringRuntime = useCanvasAuthoringRuntime({
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
    workspaceScope,
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
  const resolvedGraphDraftCanvasId = resolveGraphDraftAuthoringCanvasId(draftReadModel);
  const hasResolvedGraphDraftAuthority = resolvedGraphDraftCanvasId !== null;
  const runtimePolicy = useMemo(() => {
    const draftAdmission = applyCanvasDraftPostureToRuntimePolicyInput({
      posture: draftAccessPosture,
      canMutateGraph: canMutateGraph && hasResolvedGraphDraftAuthority,
      canPlan:
        store.userPermissions.canPlan && !isDraftRecoveryBlocked && hasResolvedGraphDraftAuthority,
      canRun:
        store.userPermissions.canRun && !isDraftRecoveryBlocked && hasResolvedGraphDraftAuthority,
      canReloadLatestDraft: authoringRuntime.draftStatusState.showReloadAction,
    });

    return resolveCanvasRuntimePolicy({
      activeRuntime: activeCanvasGraphStrategyResolution,
      canMutateGraph: draftAdmission.canMutateGraph,
      canOpenSourceImport: hasAuthorizedSourceImportContribution,
      canPlan: draftAdmission.canPlan,
      canRun: draftAdmission.canRun,
      canReloadLatestDraft: draftAdmission.canReloadLatestDraft,
    });
  }, [
    activeCanvasGraphStrategyResolution,
    authoringRuntime.draftStatusState.showReloadAction,
    canMutateGraph,
    draftAccessPosture,
    hasResolvedGraphDraftAuthority,
    isDraftRecoveryBlocked,
    store.userPermissions.canPlan,
    store.userPermissions.canRun,
    hasAuthorizedSourceImportContribution,
  ]);
  const canMutateActiveCanvas = runtimePolicy.commands.canMutateGraph;
  const canSelectExecution = runtimePolicy.commands.canPlan || runtimePolicy.commands.canRun;
  const executionSelectionIntent = useMemo(
    () =>
      createCanvasExecutionSelectionIntent(
        executionScope.selectedNodeIds,
        executionScope.selectionMode
      ),
    [executionScope.selectedNodeIds, executionScope.selectionMode]
  );
  const setSelectedNodesForActiveCanvas = useCallback(
    (nodeIds: string[]) => store.setSelectedNodes(nodeIds),
    [store.setSelectedNodes]
  );
  const reconcileSelectionAfterNodeRemoval = useCallback(
    (remainingVisibleNodeIds: string[]) => {
      setSelectedNodesForActiveCanvas(remainingVisibleNodeIds);
    },
    [setSelectedNodesForActiveCanvas]
  );

  useCanvasSelectionSync({
    isBootstrapping: draftSession.syncState === 'bootstrapping',
    preserveSelectionIntent: false,
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
    reconcileSelectionAfterNodeRemoval,
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
    reconcileSelectionAfterNodeRemoval,
    setInspectorNode: store.setInspectorNode,
    toggleInspectorPanel: store.toggleInspectorPanel,
    onLayoutComplete: persistence.handleNodePositionsSave,
  });

  const impactFocusNodeIds = useMemo(
    () =>
      impactFocusNodeId != null && graphModel.nodes.some((node) => node.id === impactFocusNodeId)
        ? [impactFocusNodeId]
        : [],
    [graphModel.nodes, impactFocusNodeId]
  );

  const overlayModel = useCanvasOverlayModel({
    canonicalNodes: graphModel.canonicalNodes,
    currentRun: store.currentRun,
    capabilities,
    edges: graphModel.edges,
    impactFocusNodeIds,
    impactOverlayEnabled: store.impactOverlayEnabled,
  });

  const executionActions = useCanvasExecutionActions({
    graphDraftCanvasId: resolvedGraphDraftCanvasId,
    plansService,
    runsService,
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    executionStrategy,
    canonicalNodes: visibleScope.canonicalNodes,
    canonicalEdges: visibleScope.canonicalEdges,
    selectionIntent: executionSelectionIntent,
    workspaceNodeIds: executionScope.workspaceNodeIds,
    flushDraftForExecution: authoringRuntime.flushDraftForExecution,
    canPlan: runtimePolicy.commands.canPlan,
    canRun: runtimePolicy.commands.canRun,
    sessionContext,
    executionEnvironmentId: draftReadModel?.record?.draft.canvas.environmentId,
    shellFeedback,
    bottomDrawerVisible: store.bottomDrawerVisible,
    currentPlan: store.currentPlan,
    setCurrentPlan: store.setCurrentPlan,
    setBottomDrawerHeight: store.setBottomDrawerHeight,
    toggleBottomDrawer: store.toggleBottomDrawer,
    onRunStarted: navigationActions.handleRunStarted,
  });

  const {
    transformationValidation,
    nodesWithImpact,
    edgesWithImpact,
    handleEdgesChange,
    inspectorNode,
  } = useCanvasControllerReadModel({
    graphModel: {
      ...graphModel,
      onEdgesChange: mutationHandlers.handleEdgesChange,
    },
    visibleScope,
    executionScope,
    uiScope,
    overlayModel,
    graphHandlers,
    onToggleExecutionSelection: graphHandlers.handleToggleNodeSelection,
    runtimeCapabilities: capabilities,
    canMutateGraph: canMutateActiveCanvas,
    canSelectExecution,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
  });
  const inspectorCommands = useCanvasInspectorCommands({
    inspectorNode,
    setDraftSession,
    workspaceScope,
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
      runtimePolicy,
      surfaceStrategy,
    },
    readModel: {
      transformationValidation,
      nodesWithImpact,
      edgesWithImpact,
      handleEdgesChange,
      inspectorNode,
    },
    inspectorCommands,
    executionSelectionRecovery: { model: null, commands: null },
    handleImpactFocusNodeChange: setImpactFocusNodeId,
  });
}
