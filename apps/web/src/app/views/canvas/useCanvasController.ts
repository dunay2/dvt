/** Owned concern: compose Canvas environment, authoring runtime, adapter seams, and execution seams into one route facade. */
import { useMemo } from 'react';

import { buildCanvasControllerViewModel } from './canvasControllerViewModel';
import { useCanvasControllerRuntime } from './useCanvasControllerRuntime';
import { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasControllerPresentation } from './useCanvasControllerPresentation';
import { useCanvasSelectionSync } from './useCanvasSelectionSync';

export function useCanvasController() {
  const environment = useCanvasControllerEnvironment();
  const {
    capabilities,
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    plansService,
    runsService,
    sessionContext,
    shellFeedback,
    navigationActions,
    store,
  } = environment;
  const runtime = useCanvasControllerRuntime(environment);
  const {
    authoringRuntime,
    runtimePolicy,
    graphStrategy,
    executionStrategy,
    surfaceStrategy,
    resolvedGraphDraftCanvasId,
    canMutateActiveCanvas,
    executionSelectionIntent,
    impactFocusNodeId,
    setImpactFocusNodeId,
  } = runtime;
  const {
    graphModel,
    draftSession,
    setDraftSession,
    runDraftSessionCommand,
    visibleScope,
    uiScope,
    executionScope,
    draftReadModel,
  } = authoringRuntime;
  const setSelectedNodesForActiveCanvas = store.setSelectedNodes;

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
    reconcileSelectionAfterNodeRemoval: setSelectedNodesForActiveCanvas,
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
    runDraftSessionCommand,
    setSelectedNodes: setSelectedNodesForActiveCanvas,
    reconcileSelectionAfterNodeRemoval: setSelectedNodesForActiveCanvas,
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

  const { readModel, inspectorCommands } = useCanvasControllerPresentation({
    environment,
    runtime,
    graphHandlers,
    mutationHandlers,
    overlayModel,
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
    readModel,
    inspectorCommands,
    executionSelectionRecovery: { model: null, commands: null },
    handleImpactFocusNodeChange: setImpactFocusNodeId,
  });
}
