import { type NodeTypes } from '@xyflow/react';
import { useMemo } from 'react';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import { getRegisteredPluginIds } from '../../plugins/registry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import {
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceService,
} from '../../services/AppServicesContext';
import type { ExecutionPlan } from '../../types/dbt';
import { buildNodesWithImpact } from './canvasImpactOverlay';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import { useCanvasGraphModel } from './useCanvasGraphModel';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';
import { useCanvasNavigationActions } from './useCanvasNavigationActions';
import { useCanvasOverlayModel } from './useCanvasOverlayModel';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';
import { validateTransformationGraph } from './transformationGraphValidation';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

export function useCanvasController() {
  const { data: capabilities } = useCapabilitiesQuery();
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const canvasAuthoringMode: 'transformation' | 'dbt' =
    graphStrategy.id === 'transformation' ? 'transformation' : 'dbt';
  const workspaceService = useWorkspaceService();
  const plansService = usePlansService();
  const runsService = useRunsService();
  const sessionContext = useSessionContext();
  const shellFeedback = useShellFeedback();
  const navigationActions = useCanvasNavigationActions();

  const store = useCanvasStoreFacade();

  const graphModel = useCanvasGraphModel({
    workspaceLayoutKey: store.workspaceLayoutKey,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
  });

  const overlayModel = useCanvasOverlayModel({
    canonicalNodes: graphModel.canonicalNodes,
    currentRun: store.currentRun,
    capabilities,
    edges: graphModel.edges,
    selectedNodeIds: store.selectedNodeIds,
  });

  const persistence = useCanvasLayoutPersistence({
    hasHydrated: store._hasHydrated,
    isGraphQueryPending: graphModel.graphSnapshotQuery.isPending,
    workspaceLayoutKey: store.workspaceLayoutKey,
    persistedViewport: store.persistedViewport,
    setCanvasViewport: store.setCanvasViewport,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  const graphHandlers = useCanvasGraphHandlers({
    graphStrategy,
    canonicalNodesById: graphModel.canonicalNodesById,
    edges: graphModel.edges,
    nodes: graphModel.nodes,
    selectedNodeIds: store.selectedNodeIds,
    inspectorNodeId: store.inspectorNodeId,
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    setNodes: graphModel.setNodes,
    setEdges: graphModel.setEdges,
    setSelectedNodes: store.setSelectedNodes,
    setInspectorNode: store.setInspectorNode,
    toggleInspectorPanel: store.toggleInspectorPanel,
    onLayoutComplete: persistence.handleNodePositionsSave,
  });

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    canonicalNodes: graphModel.canonicalNodes,
    canonicalEdges: graphModel.canonicalEdges,
    selectedNodeIds: store.selectedNodeIds,
    workspaceNodeIds: graphModel.workspaceNodes.map((node) => node.id),
    canPlan: store.userPermissions.canPlan,
    canRun: store.userPermissions.canRun,
    sessionContext,
    shellFeedback,
    consolePanelVisible: store.consolePanelVisible,
    currentPlan: store.currentPlan as ExecutionPlan | null,
    setCurrentPlan: store.setCurrentPlan,
    setConsolePanelHeight: store.setConsolePanelHeight,
    toggleConsolePanel: store.toggleConsolePanel,
    onRunStarted: navigationActions.handleRunStarted,
  });
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: graphModel.canonicalNodes,
        edges: graphModel.canonicalEdges,
        selectedNodeIds: store.selectedNodeIds,
        workspaceNodeIds: graphModel.workspaceNodes.map((node) => node.id),
      }),
    [
      graphModel.canonicalEdges,
      graphModel.canonicalNodes,
      graphModel.workspaceNodes,
      store.selectedNodeIds,
    ]
  );

  const nodesWithImpact = useMemo(
    () =>
      buildNodesWithImpact({
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds: store.selectedNodeIds,
        impactOverlayEnabled: store.impactOverlayEnabled,
        columnLevelLineageEnabled: store.columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onRemoveNode: graphHandlers.handleRemoveNode,
          onToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
        },
      }).map((node) => ({
        ...node,
        data: {
          ...node.data,
          activeRunId: overlayModel.activeRunId,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
        },
      })),
    [
      store.columnLevelLineageEnabled,
      graphHandlers.handleInspectNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
      graphModel.edges,
      graphModel.nodes,
      store.impactOverlayEnabled,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      store.selectedNodeIds,
    ]
  );

  return {
    focusMode: store.focusMode,
    explorerPanelVisible: store.explorerPanelVisible,
    inspectorPanelVisible: store.inspectorPanelVisible,
    explorerNodes: graphModel.canonicalNodes,
    inspectorNode: store.inspectorNodeId
      ? (graphModel.canonicalNodesById.get(store.inspectorNodeId) ?? null)
      : null,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    userPermissions: store.userPermissions,
    canvasAuthoringMode,
    nodesWithImpact,
    edges: graphModel.edges,
    nodeTypes,
    gridSize: store.gridSize,
    viewport: store.persistedViewport,
    onNodesChange: graphModel.onNodesChange,
    onEdgesChange: graphModel.onEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange: persistence.handleViewportChange,
    handleNodeDragStop: persistence.handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
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
    canStartRun: executionActions.canStartRun,
    planStatusSummary: executionActions.planStatusSummary,
    exclusiveOverlayMode: overlayModel.exclusiveOverlayMode,
    canUseCostOverlay: overlayModel.canUseCostOverlay,
    impactOverlayEnabled: store.impactOverlayEnabled,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    transformationValidation,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    currentPlan: store.currentPlan as ExecutionPlan | null,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}
