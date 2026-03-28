import { useQuery } from '@tanstack/react-query';
import { useEdgesState, useNodesState, type Edge, type Node, type NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import { resolveCanvasGraphStrategy } from '../../plugins/graphStrategyRegistry';
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

export function useCanvasController() {
  const navigate = useNavigate();
  const dataSourceMode = resolveDataSource();
  const graphStrategy = useMemo(() => resolveCanvasGraphStrategy(), []);
  const workspaceService = useMemo(() => createWorkspaceService(dataSourceMode), [dataSourceMode]);
  const plansService = useMemo(() => createPlansService(dataSourceMode), [dataSourceMode]);
  const runsService = useMemo(() => createRunsService(dataSourceMode), [dataSourceMode]);

  const {
    focusMode,
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
  } = useAppStore();

  const graphSnapshotQuery = useQuery({
    queryKey: ['workspace', 'graph'],
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
    () => (currentRun ? mapRunToCanonical(currentRun) : null),
    [currentRun]
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
        mapCanonicalNodeToCanvasNode(node, i, columnLevelLineageEnabled)
      ),
    [canonicalNodes, columnLevelLineageEnabled]
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
      getAllOverlays(),
      activeExclusiveOverlayId,
      overlayCtx
    );
  }, [
    activeRunSnapshot,
    canonicalNodes,
    costByNodeId,
    edges,
    exclusiveOverlayMode,
    runStatusByNodeId,
    selectedNodeIds,
  ]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialEdges, initialNodes, setEdges, setNodes]);

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
    registeredPlugins: getRegisteredPluginIds(),
    userPermissions,
    nodesWithImpact,
    edges,
    nodeTypes,
    gridSize,
    onNodesChange,
    onEdgesChange,
    onConnect: graphHandlers.onConnect,
    handleNodeClick: graphHandlers.handleNodeClick,
    onSelectionChange: graphHandlers.onSelectionChange,
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
