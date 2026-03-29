import { useQuery } from '@tanstack/react-query';
import { useEdgesState, useNodesState, type Edge, type Node, type NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
import { useCapabilitiesQuery } from '../../queries/useCapabilitiesQuery';
import { resolveDataSource } from '../../services/config/dataSource';
import { createPlansService } from '../../services/plans/plansService';
import { createRunsService } from '../../services/runs/runsService';
import { createWorkspaceService } from '../../services/workspace/workspaceService';
import { useAppStore } from '../../stores/appStore';
import type { CanonicalEdge, CanonicalNode, CanonicalRun } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import { buildNodesWithImpact } from './canvasImpactOverlay';
import { buildNodeDecorations, buildOverlayContext } from './canvasOverlayContext';
import { mapCanonicalEdgeToCanvasEdge, mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { getAllOverlays, getRegisteredPluginIds, mapRunToCanonical } from '../../plugins/registry';
import { useCanvasExecutionActions } from './useCanvasExecutionActions';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { NodeCostData } from '../../plugins/contracts/PluginServices';
import type { RunStatusSnapshot } from '../../types/engine';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

function isCanonicalNode(value: CanonicalNode | null): value is CanonicalNode {
  return value !== null;
}

function isCanonicalEdge(value: CanonicalEdge | null): value is CanonicalEdge {
  return value !== null;
}

function buildRunStatusByNodeId(canonicalRun: CanonicalRun | null): ReadonlyMap<string, string> {
  const runStatusByNodeId = new Map<string, string>();

  if (!canonicalRun) {
    return runStatusByNodeId;
  }

  for (const task of canonicalRun.tasks) {
    runStatusByNodeId.set(task.nodeId, task.status);
  }

  return runStatusByNodeId;
}

function toRunStatusSnapshot(canonicalRun: CanonicalRun | null): RunStatusSnapshot | null {
  if (!canonicalRun) {
    return null;
  }

  const statusMap: Record<CanonicalRun['status'], RunStatusSnapshot['status']> = {
    pending: 'PENDING',
    running: 'RUNNING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
  };

  return {
    runId: canonicalRun.runId,
    status: statusMap[canonicalRun.status],
    startedAt: canonicalRun.startedAt,
    completedAt: canonicalRun.finishedAt,
  };
}

function areViewportsEqual(
  left: { x: number; y: number; zoom: number } | null,
  right: { x: number; y: number; zoom: number } | null
): boolean {
  if (left == null && right == null) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

export function useCanvasController() {
  const navigate = useNavigate();
  const { data: capabilities } = useCapabilitiesQuery();
  const dataSourceMode = resolveDataSource();
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const workspaceService = useMemo(() => createWorkspaceService(dataSourceMode), [dataSourceMode]);
  const plansService = useMemo(() => createPlansService(dataSourceMode), [dataSourceMode]);
  const runsService = useMemo(() => createRunsService(dataSourceMode), [dataSourceMode]);

  const {
    _hasHydrated,
    focusMode,
    selectedTenant,
    selectedProject,
    selectedEnvironment,
    selectedNodes: selectedNodeIds,
    setSelectedNodes,
    inspectorNodeId,
    setInspectorNode,
    impactOverlayEnabled,
    toggleImpactOverlay,
    columnLevelLineageEnabled,
    toggleColumnLevelLineage,
    setCurrentPlan,
    currentPlan,
    currentRun,
    userPermissions,
    setConsolePanelHeight,
    consolePanelVisible,
    toggleExplorerPanel,
    toggleInspectorPanel,
    toggleConsolePanel,
    explorerPanelVisible,
    inspectorPanelVisible,
    gridSize,
    canvasLayouts,
    setCanvasViewport,
    setCanvasNodePositions,
  } = useAppStore();

  const workspaceLayoutKey = `${selectedTenant}::${selectedProject}::${selectedEnvironment}`;
  const workspaceCanvasLayout = canvasLayouts[workspaceLayoutKey];
  const persistedViewport = workspaceCanvasLayout?.viewport ?? null;
  const persistedNodePositions = workspaceCanvasLayout?.nodePositions ?? {};

  const graphSnapshotQuery = useQuery({
    queryKey: ['workspace', 'graph', workspaceLayoutKey],
    queryFn: () => workspaceService.getGraphSnapshot(),
  });

  const workspaceNodes = graphSnapshotQuery.data?.nodes ?? [];
  const workspaceEdges = graphSnapshotQuery.data?.edges ?? [];

  const canonicalNodes = useMemo(
    () =>
      workspaceNodes
        .map((workspaceNode) => graphStrategy.mapNodeToCanonical(workspaceNode))
        .filter(isCanonicalNode),
    [workspaceNodes, graphStrategy]
  );

  const canonicalEdges = useMemo(
    () =>
      workspaceEdges
        .map((workspaceEdge) => graphStrategy.mapEdgeToCanonical(workspaceEdge))
        .filter(isCanonicalEdge),
    [workspaceEdges, graphStrategy]
  );

  const canonicalNodesById = useMemo(
    () => new Map(canonicalNodes.map((node) => [node.id, node])),
    [canonicalNodes]
  );
  const activeCanonicalRun = useMemo(
    () => (currentRun ? mapRunToCanonical(currentRun, capabilities) : null),
    [capabilities, currentRun]
  );
  const activeRunSnapshot = useMemo(
    () => toRunStatusSnapshot(activeCanonicalRun),
    [activeCanonicalRun]
  );
  const activeRunId = activeCanonicalRun?.runId ?? null;
  const runStatusByNodeId = useMemo(
    () => buildRunStatusByNodeId(activeCanonicalRun),
    [activeCanonicalRun]
  );
  const costByNodeId = useMemo(() => {
    const nodeCosts = new Map<string, NodeCostData>();

    for (const node of canonicalNodes) {
      if (typeof node.lastCost !== 'number') {
        continue;
      }

      nodeCosts.set(node.id, {
        nodeId: node.id,
        cost: node.lastCost,
        currency: 'USD',
        breakdown:
          typeof node.lastDuration === 'number'
            ? { durationSeconds: node.lastDuration }
            : undefined,
      });
    }

    return nodeCosts;
  }, [canonicalNodes]);
  const [exclusiveOverlayMode, setExclusiveOverlayMode] = useState<'runtime' | 'cost'>('runtime');

  const initialNodes: Node[] = useMemo(
    () =>
      canonicalNodes.map((node, i) =>
        mapCanonicalNodeToCanvasNode(
          node,
          i,
          columnLevelLineageEnabled,
          undefined,
          persistedNodePositions[node.id]
        )
      ),
    [canonicalNodes, columnLevelLineageEnabled, persistedNodePositions]
  );

  const initialEdges: Edge[] = useMemo(
    () => canonicalEdges.map((canonicalEdge) => mapCanonicalEdgeToCanvasEdge(canonicalEdge)),
    [canonicalEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (costByNodeId.size === 0 && exclusiveOverlayMode === 'cost') {
      setExclusiveOverlayMode('runtime');
    }
  }, [costByNodeId.size, exclusiveOverlayMode]);

  const overlayDecorations = useMemo(() => {
    const activeExclusiveOverlayId =
      exclusiveOverlayMode === 'runtime' && activeRunSnapshot == null ? null : exclusiveOverlayMode;
    const overlayCtx = buildOverlayContext(
      edges,
      selectedNodeIds,
      activeRunSnapshot,
      runStatusByNodeId,
      costByNodeId
    );
    return buildNodeDecorations(
      canonicalNodes,
      getAllOverlays(capabilities),
      activeExclusiveOverlayId,
      overlayCtx
    );
  }, [
    activeRunSnapshot,
    capabilities,
    canonicalNodes,
    costByNodeId,
    edges,
    exclusiveOverlayMode,
    runStatusByNodeId,
    selectedNodeIds,
  ]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const nextNodes = canonicalNodes.map((node, index) => {
        const currentNode = currentNodes.find((candidate) => candidate.id === node.id);
        const persisted = persistedNodePositions[node.id];

        console.debug('[canvas] sync node', node.id, {
          persisted,
          current: currentNode?.position,
          hydrated: _hasHydrated,
          pending: graphSnapshotQuery.isPending,
        });

        return mapCanonicalNodeToCanvasNode(
          node,
          index,
          columnLevelLineageEnabled,
          undefined,
          persisted ?? currentNode?.position
        );
      });

      const isSameNodeLayout =
        currentNodes.length === nextNodes.length &&
        currentNodes.every((node, index) => {
          const nextNode = nextNodes[index];

          return (
            nextNode != null &&
            node.id === nextNode.id &&
            node.position.x === nextNode.position.x &&
            node.position.y === nextNode.position.y &&
            node.data.showColumns === nextNode.data.showColumns
          );
        });

      return isSameNodeLayout ? currentNodes : nextNodes;
    });
    setEdges(initialEdges);
  }, [
    canonicalNodes,
    columnLevelLineageEnabled,
    initialEdges,
    persistedNodePositions,
    setEdges,
    setNodes,
  ]);

  const handleNodePositionsSave = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      console.debug('[canvas] save positions', {
        _hasHydrated,
        isPending: graphSnapshotQuery.isPending,
        positionKeys: Object.keys(positions),
        positions,
      });
      if (!_hasHydrated || graphSnapshotQuery.isPending) {
        return;
      }
      setCanvasNodePositions(workspaceLayoutKey, positions);
    },
    [_hasHydrated, graphSnapshotQuery.isPending, setCanvasNodePositions, workspaceLayoutKey]
  );

  useEffect(() => {
    console.debug('[canvas] hydration/query state', {
      _hasHydrated,
      isPending: graphSnapshotQuery.isPending,
      persistedKeys: Object.keys(persistedNodePositions),
      workspaceLayoutKey,
    });
  }, [_hasHydrated, graphSnapshotQuery.isPending, persistedNodePositions, workspaceLayoutKey]);

  const handleNodeDragStop = useCallback<
    NonNullable<import('@xyflow/react').ReactFlowProps['onNodeDragStop']>
  >(
    (_event, _node, allNodes) => {
      handleNodePositionsSave(
        Object.fromEntries(allNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]))
      );
    },
    [handleNodePositionsSave]
  );

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (areViewportsEqual(persistedViewport, viewport)) {
        return;
      }

      setCanvasViewport(workspaceLayoutKey, viewport);
    },
    [persistedViewport, setCanvasViewport, workspaceLayoutKey]
  );

  const graphHandlers = useCanvasGraphHandlers({
    graphStrategy,
    canonicalNodesById,
    edges,
    nodes,
    selectedNodeIds,
    inspectorNodeId,
    focusMode,
    inspectorPanelVisible,
    columnLevelLineageEnabled,
    setNodes,
    setEdges,
    setSelectedNodes,
    setInspectorNode,
    toggleInspectorPanel,
    onLayoutComplete: handleNodePositionsSave,
  });

  const handleRunStarted = useCallback(
    (runId: string) => {
      void navigate(`/runs/${runId}`);
    },
    [navigate]
  );

  const executionActions = useCanvasExecutionActions({
    plansService,
    runsService,
    selectedNodeIds,
    workspaceNodeIds: workspaceNodes.map((node) => node.id),
    canPlan: userPermissions.canPlan,
    canRun: userPermissions.canRun,
    consolePanelVisible,
    currentPlan: currentPlan as ExecutionPlan | null,
    setCurrentPlan,
    setConsolePanelHeight,
    toggleConsolePanel,
    onRunStarted: handleRunStarted,
  });

  const nodesWithImpact = useMemo(
    () =>
      buildNodesWithImpact({
        nodes,
        edges,
        selectedNodeIds,
        impactOverlayEnabled,
        columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onRemoveNode: graphHandlers.handleRemoveNode,
          onToggleNodeSelection: graphHandlers.handleToggleNodeSelection,
        },
      }).map((node) => ({
        ...node,
        data: {
          ...node.data,
          activeRunId,
          runStatusByNodeId,
          overlayDecoration: overlayDecorations.get(node.id) ?? null,
        },
      })),
    [
      activeRunId,
      columnLevelLineageEnabled,
      edges,
      graphHandlers.handleInspectNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleToggleNodeSelection,
      impactOverlayEnabled,
      nodes,
      overlayDecorations,
      runStatusByNodeId,
      selectedNodeIds,
    ]
  );

  const inspectorNode = inspectorNodeId ? (canonicalNodesById.get(inspectorNodeId) ?? null) : null;
  const handleToggleCostOverlay = useCallback(() => {
    if (costByNodeId.size === 0) {
      return;
    }

    setExclusiveOverlayMode((current) => (current === 'cost' ? 'runtime' : 'cost'));
  }, [costByNodeId.size]);

  return {
    focusMode,
    explorerPanelVisible,
    inspectorPanelVisible,
    explorerNodes: canonicalNodes,
    inspectorNode,
    activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    userPermissions,
    nodesWithImpact,
    edges,
    nodeTypes,
    gridSize,
    viewport: persistedViewport,
    onNodesChange,
    onEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
    handleViewportChange,
    handleNodeDragStop,
    handleDrop: graphHandlers.handleDrop,
    handleDragOver: graphHandlers.handleDragOver,
    hideExplorerPanel: toggleExplorerPanel,
    showExplorerPanel: toggleExplorerPanel,
    hideInspectorPanel: toggleInspectorPanel,
    showInspectorPanel: toggleInspectorPanel,
    handleAutoLayout: graphHandlers.handleAutoLayout,
    handleToggleCostOverlay,
    toggleImpactOverlay,
    toggleColumnLevelLineage,
    handlePlan: executionActions.handlePlan,
    handleStartRun: executionActions.handleStartRun,
    exclusiveOverlayMode,
    canUseCostOverlay: costByNodeId.size > 0,
    impactOverlayEnabled,
    columnLevelLineageEnabled,
    planModalOpen: executionActions.planModalOpen,
    setPlanModalOpen: executionActions.setPlanModalOpen,
    currentPlan: currentPlan as ExecutionPlan | null,
    confirmEdgeModal: graphHandlers.confirmEdgeModal,
    setConfirmEdgeModal: graphHandlers.setConfirmEdgeModal,
    confirmEdgeCreation: graphHandlers.confirmEdgeCreation,
  };
}
