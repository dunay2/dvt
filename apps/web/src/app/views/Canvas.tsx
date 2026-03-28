import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react';
import dagre from 'dagre';
import { useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  Play,
  FileCheck,
  Target,
  Columns,
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import DbtNodeComponent from '../components/canvas/DbtNodeComponent';
import DbtExplorer from '../components/DbtExplorer';
import InspectorPanel from '../components/InspectorPanel';
import { ConfirmEdgeModal, PlanPreviewModal } from '../components/Modals';
import { Button } from '../components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  canConnectNodeRoles,
  resolveCanvasEdgeType,
  resolveNodeKindRegistration,
} from '../plugins/nodeTypeRegistry';
import { buildSessionRunContext, createPlansService } from '../services/plans/plansService';
import { resolveDataSource } from '../services/config/dataSource';
import { createWorkspaceService } from '../services/workspace/workspaceService';
import { useAppStore } from '../stores/appStore';
import {
  CANONICAL_NODE_DRAG_MIME_TYPE,
  type CanonicalEdge,
  type CanonicalNode,
  type CanonicalNodeStatus,
  type CoreNodeRole,
  type PluginNodeKind,
} from '../types/canonical';
import type { DbtEdge, DbtNode, DbtNodeType, ExecutionPlan } from '../types/dbt';
import {
  createCanvasEdgeFromConnection,
  mapCanonicalEdgeToCanvasEdge,
  mapCanonicalNodeToCanvasNode,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvas/canvasNodeMapper';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

const DBT_TYPE_TO_KIND: Record<DbtNodeType, PluginNodeKind> = {
  SOURCE: 'dbt:source',
  MODEL: 'dbt:model',
  SEED: 'dbt:seed',
  SNAPSHOT: 'dbt:snapshot',
  TEST: 'dbt:test',
  EXPOSURE: 'dbt:exposure',
  METRIC: 'dbt:metric',
  MACRO: 'dbt:macro',
};

const CANONICAL_NODE_ROLES: ReadonlySet<CoreNodeRole> = new Set([
  'input',
  'transform',
  'check',
  'output',
  'control',
]);

const CANONICAL_NODE_STATUSES: ReadonlySet<CanonicalNodeStatus> = new Set([
  'idle',
  'running',
  'success',
  'failed',
  'skipped',
  'warn',
]);

function mapDbtNodeToCanonical(node: DbtNode): CanonicalNode {
  const kind = DBT_TYPE_TO_KIND[node.type];
  const kindRegistration = resolveNodeKindRegistration(kind);

  return {
    id: node.id,
    name: node.name,
    pluginId: 'dbt',
    kind,
    role: kindRegistration.role,
    status: node.status,
    tags: node.tags,
    path: node.path,
    description: node.description,
    lastDuration: node.lastDuration,
    lastCost: node.lastCost,
    metadata: {
      package: node.package,
      dependencies: node.dependencies,
      columns: node.columns,
      config: node.config,
      compiledSql: node.compiledSql,
      dbtType: node.type,
      typeLabel: kindRegistration.label,
    },
  };
}

function mapDbtEdgeToCanonical(edge: DbtEdge): CanonicalEdge {
  return {
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    relation:
      edge.type === 'test' ? 'validation' : edge.type === 'metric' ? 'metric' : 'consumption',
  };
}

function parseCanonicalDropPayload(dataTransfer: DataTransfer): CanonicalNode | null {
  const payload = dataTransfer.getData(CANONICAL_NODE_DRAG_MIME_TYPE);
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<CanonicalNode>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.pluginId !== 'string' ||
      typeof parsed.kind !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.status !== 'string'
    ) {
      return null;
    }

    if (
      !CANONICAL_NODE_ROLES.has(parsed.role as CoreNodeRole) ||
      !CANONICAL_NODE_STATUSES.has(parsed.status as CanonicalNodeStatus)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      pluginId: parsed.pluginId,
      kind: parsed.kind as PluginNodeKind,
      role: parsed.role as CoreNodeRole,
      status: parsed.status as CanonicalNodeStatus,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      path: typeof parsed.path === 'string' ? parsed.path : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      lastDuration: typeof parsed.lastDuration === 'number' ? parsed.lastDuration : undefined,
      lastCost: typeof parsed.lastCost === 'number' ? parsed.lastCost : undefined,
      metadata:
        parsed.metadata && typeof parsed.metadata === 'object'
          ? (parsed.metadata as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return null;
  }
}

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function CanvasContent() {
  const dataSourceMode = resolveDataSource();
  const workspaceService = useMemo(() => createWorkspaceService(dataSourceMode), [dataSourceMode]);
  const plansService = useMemo(() => createPlansService(dataSourceMode), [dataSourceMode]);
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

  const canonicalNodes = useMemo(() => workspaceNodes.map(mapDbtNodeToCanonical), [workspaceNodes]);
  const canonicalEdges = useMemo(() => workspaceEdges.map(mapDbtEdgeToCanonical), [workspaceEdges]);
  const canonicalNodesById = useMemo(
    () => new Map(canonicalNodes.map((node) => [node.id, node])),
    [canonicalNodes]
  );

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<{
    open: boolean;
    edge: { source: string; target: string; type: string } | null;
  }>({ open: false, edge: null });

  const initialNodes: Node[] = useMemo(
    () =>
      canonicalNodes.map((node, idx) =>
        mapCanonicalNodeToCanvasNode(node, idx, columnLevelLineageEnabled)
      ),
    [canonicalNodes, columnLevelLineageEnabled]
  );

  const initialEdges: Edge[] = useMemo(
    () => canonicalEdges.map((edge) => mapCanonicalEdgeToCanvasEdge(edge)),
    [canonicalEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = canonicalNodesById.get(connection.source);
      const targetNode = canonicalNodesById.get(connection.target);
      if (!sourceNode || !targetNode) return;

      if (!canConnectNodeRoles(sourceNode.role, targetNode.role)) {
        toast.error(`Cannot connect ${sourceNode.kind} to ${targetNode.kind}`);
        return;
      }

      const wouldCreateCycle = edges.some(
        (edge) => edge.source === connection.target && edge.target === connection.source
      );
      if (wouldCreateCycle) {
        toast.error('Cannot create cycle in DAG');
        return;
      }

      const edgeType = resolveCanvasEdgeType({
        sourceRole: sourceNode.role,
        targetRole: targetNode.role,
        sourceKind: sourceNode.kind,
        targetKind: targetNode.kind,
      });

      setConfirmEdgeModal({
        open: true,
        edge: {
          source: sourceNode.name,
          target: targetNode.name,
          type: edgeType,
        },
      });

      (window as Window & { __pendingConnection?: Connection }).__pendingConnection = connection;
    },
    [canonicalNodesById, edges]
  );

  const confirmEdgeCreation = useCallback(() => {
    const connection = (window as Window & { __pendingConnection?: Connection })
      .__pendingConnection;
    if (connection?.source && connection.target) {
      setEdges((existingEdges) =>
        addEdge(
          createCanvasEdgeFromConnection({
            source: connection.source,
            target: connection.target,
          }),
          existingEdges
        )
      );
      toast.success('Dependency added');
    }
    setConfirmEdgeModal({ open: false, edge: null });
  }, [setEdges]);

  const handleInspectNode = useCallback(
    (nodeId: string) => {
      setInspectorNode(nodeId);
      if (!focusMode && !inspectorPanelVisible) {
        toggleInspectorPanel();
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode, toggleInspectorPanel]
  );

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      if (inspectorPanelVisible && !focusMode) {
        setInspectorNode(node.id);
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedCanvasNodes }: { nodes: Node[] }) => {
      setSelectedNodes(selectedCanvasNodes.map((node) => node.id));
    },
    [setSelectedNodes]
  );

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('Layout applied');
  }, [nodes, edges, setNodes, setEdges]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const canonicalNode = parseCanonicalDropPayload(event.dataTransfer);
      const legacyPayload = event.dataTransfer.getData('application/dbt-node');
      const droppedNode =
        canonicalNode ??
        (legacyPayload ? mapDbtNodeToCanonical(JSON.parse(legacyPayload) as DbtNode) : null);
      if (!droppedNode) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode = mapDroppedCanonicalNodeToCanvasNode(
        droppedNode,
        position,
        columnLevelLineageEnabled
      );

      setNodes((existingNodes) => {
        if (existingNodes.find((node) => node.id === droppedNode.id)) {
          toast.info('Node already on canvas');
          return existingNodes;
        }
        toast.success(`Added ${droppedNode.name} to canvas`);
        return [...existingNodes, newNode];
      });
    },
    [columnLevelLineageEnabled, setNodes]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleToggleNodeSelection = useCallback(
    (nodeId: string, shouldSelect: boolean) => {
      if (shouldSelect) {
        if (selectedNodeIds.includes(nodeId)) {
          return;
        }
        setSelectedNodes([...selectedNodeIds, nodeId]);
        return;
      }

      setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));
    },
    [selectedNodeIds, setSelectedNodes]
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      const nodeName = nodes.find((node) => node.id === nodeId)?.data?.name ?? nodeId;
      setNodes((existingNodes) => existingNodes.filter((node) => node.id !== nodeId));
      setEdges((existingEdges) =>
        existingEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));

      if (inspectorNodeId === nodeId) {
        setInspectorNode(null);
      }

      toast.success(`Removed ${nodeName}`);
    },
    [
      nodes,
      setNodes,
      setEdges,
      setSelectedNodes,
      selectedNodeIds,
      inspectorNodeId,
      setInspectorNode,
    ]
  );

  const handlePlan = useCallback(async () => {
    if (!userPermissions.canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }
    try {
      const selectedForPlan =
        selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodes.map((node) => node.id);
      const plan = await plansService.previewPlan({
        selectedNodeIds: selectedForPlan,
        context: buildSessionRunContext(`run_ui_${Date.now()}`),
      });
      setCurrentPlan(plan);
      setPlanModalOpen(true);
      toast.success('Execution plan created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create execution plan';
      toast.error(message);
    }
  }, [plansService, selectedNodeIds, setCurrentPlan, userPermissions.canPlan, workspaceNodes]);

  const handleStartRun = useCallback(() => {
    if (!userPermissions.canRun) {
      toast.error('You do not have permission to start runs');
      return;
    }
    toast.success('Run started');
    setPlanModalOpen(false);
    if (!consolePanelVisible) {
      toggleConsolePanel();
    } else {
      setConsolePanelHeight(160);
    }
  }, [userPermissions, consolePanelVisible, toggleConsolePanel, setConsolePanelHeight]);

  const nodesWithImpact = useMemo(() => {
    if (!impactOverlayEnabled || selectedNodeIds.length === 0) {
      return nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          showColumns: columnLevelLineageEnabled,
          onInspectNode: handleInspectNode,
          onRemoveNode: handleRemoveNode,
          onToggleNodeSelection: handleToggleNodeSelection,
        },
      }));
    }

    const selectedNode = selectedNodeIds[0];
    const upstream = new Set<string>();
    const downstream = new Set<string>();

    const queue = [selectedNode];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      edges.forEach((edge) => {
        if (edge.target === current && edge.source !== selectedNode) {
          upstream.add(edge.source);
          queue.push(edge.source);
        }
      });
    }

    const queue2 = [selectedNode];
    const visited2 = new Set<string>();
    while (queue2.length > 0) {
      const current = queue2.shift()!;
      if (visited2.has(current)) continue;
      visited2.add(current);

      edges.forEach((edge) => {
        if (edge.source === current && edge.target !== selectedNode) {
          downstream.add(edge.target);
          queue2.push(edge.target);
        }
      });
    }

    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: selectedNodeIds.includes(node.id),
        impactLevel: upstream.has(node.id)
          ? 'upstream'
          : downstream.has(node.id)
            ? 'downstream'
            : 'none',
        showColumns: columnLevelLineageEnabled,
        onInspectNode: handleInspectNode,
        onRemoveNode: handleRemoveNode,
        onToggleNodeSelection: handleToggleNodeSelection,
      },
    }));
  }, [
    nodes,
    edges,
    impactOverlayEnabled,
    selectedNodeIds,
    columnLevelLineageEnabled,
    handleInspectNode,
    handleRemoveNode,
    handleToggleNodeSelection,
  ]);

  const inspectorNode = inspectorNodeId ? (canonicalNodesById.get(inspectorNodeId) ?? null) : null;

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {!focusMode && explorerPanelVisible && (
          <>
            <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
              <DbtExplorer nodes={canonicalNodes} onHide={toggleExplorerPanel} />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        <ResizablePanel
          defaultSize={
            focusMode
              ? 100
              : explorerPanelVisible && inspectorPanelVisible
                ? 63
                : explorerPanelVisible || inspectorPanelVisible
                  ? 80
                  : 100
          }
        >
          <div className="h-full flex flex-col bg-slate-950">
            <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={handleAutoLayout}>
                        <GitBranch className="size-4 mr-2" />
                        Auto Layout
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Apply dagre layout algorithm</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-6" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={impactOverlayEnabled ? 'default' : 'ghost'}
                        size="sm"
                        onClick={toggleImpactOverlay}
                      >
                        <Target className="size-4 mr-2" />
                        Impact
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle impact overlay</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={columnLevelLineageEnabled ? 'default' : 'ghost'}
                        size="sm"
                        onClick={toggleColumnLevelLineage}
                      >
                        <Columns className="size-4 mr-2" />
                        Columns
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle column-level lineage</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void handlePlan()}>
                  <FileCheck className="size-4 mr-2" />
                  Plan
                </Button>
                <Button variant="default" size="sm" onClick={handleStartRun}>
                  <Play className="size-4 mr-2" />
                  Run
                </Button>
              </div>
            </div>

            <div className="flex-1 relative" onDrop={handleDrop} onDragOver={handleDragOver}>
              {!focusMode && !explorerPanelVisible && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 border-slate-600 text-slate-50 hover:bg-slate-950"
                  onClick={toggleExplorerPanel}
                  aria-label="Show explorer panel"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              )}

              {!focusMode && !inspectorPanelVisible && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 border-slate-600 text-slate-50 hover:bg-slate-950"
                  onClick={toggleInspectorPanel}
                  aria-label="Show inspector panel"
                >
                  <PanelRightOpen className="size-4" />
                </Button>
              )}

              <ReactFlow
                nodes={nodesWithImpact}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-950"
              >
                <Background color="#374151" gap={gridSize} />
                <Controls className="bg-slate-900 border-slate-600" />
                <MiniMap
                  className="bg-slate-900 border border-slate-600"
                  nodeColor={(node) => {
                    const pluginKind =
                      (node.data as { pluginKind?: string }).pluginKind ?? 'dvt:unknown';
                    return resolveNodeKindRegistration(pluginKind).minimapColor;
                  }}
                  nodeBorderRadius={4}
                />
              </ReactFlow>
            </div>
          </div>
        </ResizablePanel>

        {!focusMode && inspectorPanelVisible && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
              <InspectorPanel
                node={inspectorNode}
                activeRunId={null}
                onHide={toggleInspectorPanel}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <PlanPreviewModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        plan={currentPlan as ExecutionPlan | null}
        onStartRun={handleStartRun}
      />

      <ConfirmEdgeModal
        open={confirmEdgeModal.open}
        onClose={() => setConfirmEdgeModal({ open: false, edge: null })}
        edge={confirmEdgeModal.edge}
        onConfirm={confirmEdgeCreation}
      />
    </>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
