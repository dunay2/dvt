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
  MarkerType,
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
import { PlanPreviewModal, ConfirmEdgeModal } from '../components/Modals';
import { Button } from '../components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { resolveDataSource } from '../services/config/dataSource';
import { buildSessionRunContext, createPlansService } from '../services/plans/plansService';
import { createWorkspaceService } from '../services/workspace/workspaceService';
import { useAppStore } from '../stores/appStore';
import { DbtNode, DbtNodeType } from '../types/dbt';

const nodeTypes: NodeTypes = {
  dbtNode: DbtNodeComponent,
};

// Allowed connections based on dbt semantics
const allowedConnections: Record<DbtNodeType, DbtNodeType[]> = {
  SOURCE: ['MODEL'],
  SEED: ['MODEL'],
  MODEL: ['MODEL', 'TEST', 'EXPOSURE', 'METRIC'],
  SNAPSHOT: ['MODEL'],
  TEST: [],
  EXPOSURE: [],
  METRIC: ['EXPOSURE'],
  MACRO: [],
};

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

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<{
    open: boolean;
    edge: { source: string; target: string; type: string } | null;
  }>({ open: false, edge: null });

  // Convert mock nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return workspaceNodes.map((node, idx) => ({
      id: node.id,
      type: 'dbtNode',
      position: { x: (idx % 3) * 250, y: Math.floor(idx / 3) * 150 },
      data: {
        name: node.name,
        type: node.type,
        status: node.status,
        lastDuration: node.lastDuration,
        lastCost: node.lastCost,
        showColumns: columnLevelLineageEnabled,
      },
    }));
  }, [workspaceNodes, columnLevelLineageEnabled]);

  const initialEdges: Edge[] = useMemo(() => {
    return workspaceEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6b7280', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280',
        width: 20,
        height: 20,
      },
    }));
  }, [workspaceEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Find source and target nodes
      const sourceNode = workspaceNodes.find((n) => n.id === connection.source);
      const targetNode = workspaceNodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Check if connection is allowed
      const allowedTargets = allowedConnections[sourceNode.type];
      if (!allowedTargets.includes(targetNode.type)) {
        toast.error(`Cannot connect ${sourceNode.type} to ${targetNode.type}`);
        return;
      }

      // Check for cycles (simplified - would need full DAG check in production)
      const wouldCreateCycle = edges.some(
        (e) => e.source === connection.target && e.target === connection.source
      );
      if (wouldCreateCycle) {
        toast.error('Cannot create cycle in DAG');
        return;
      }

      // Determine edge type
      let edgeType = 'ref';
      if (sourceNode.type === 'SOURCE') edgeType = 'source';
      else if (targetNode.type === 'TEST') edgeType = 'test';
      else if (targetNode.type === 'EXPOSURE') edgeType = 'exposure';
      else if (targetNode.type === 'METRIC') edgeType = 'metric';

      // Show confirmation modal
      setConfirmEdgeModal({
        open: true,
        edge: {
          source: sourceNode.name,
          target: targetNode.name,
          type: edgeType,
        },
      });

      // Store the connection for later
      (window as any).__pendingConnection = connection;
    },
    [edges, workspaceNodes]
  );

  const confirmEdgeCreation = useCallback(() => {
    const connection = (window as any).__pendingConnection;
    if (connection) {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6b7280',
              width: 20,
              height: 20,
            },
          },
          eds
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
      // Keep the right panel in sync with normal node selection only when it is already open.
      if (inspectorPanelVisible && !focusMode) {
        setInspectorNode(node.id);
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode]
  );

  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      setSelectedNodes(nodes.map((n) => n.id));
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
      const nodeData = event.dataTransfer.getData('application/dbt-node');
      if (!nodeData) return;

      const dbtNode: DbtNode = JSON.parse(nodeData);
      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode: Node = {
        id: dbtNode.id,
        type: 'dbtNode',
        position,
        data: {
          name: dbtNode.name,
          type: dbtNode.type,
          status: dbtNode.status,
          lastDuration: dbtNode.lastDuration,
          lastCost: dbtNode.lastCost,
          showColumns: columnLevelLineageEnabled,
        },
      };

      setNodes((nds) => {
        // Check if node already exists
        if (nds.find((n) => n.id === dbtNode.id)) {
          toast.info('Node already on canvas');
          return nds;
        }
        toast.success(`Added ${dbtNode.name} to canvas`);
        return [...nds, newNode];
      });
    },
    [setNodes, columnLevelLineageEnabled]
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
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));

      if (inspectorNodeId === nodeId) {
        setInspectorNode(null);
      }

      toast.success(`Removed ${nodeName}`);
    },
    [nodes, setNodes, setEdges, setSelectedNodes, selectedNodeIds, inspectorNodeId, setInspectorNode]
  );

  const handlePlan = useCallback(async () => {
    if (!userPermissions.canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }
    try {
      const selectedForPlan = selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodes.map((node) => node.id);
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
    // This would normally start a run via API
    toast.success('Run started');
    setPlanModalOpen(false);
    if (!consolePanelVisible) {
      toggleConsolePanel();
    } else {
      setConsolePanelHeight(160);
    }
  }, [userPermissions, consolePanelVisible, toggleConsolePanel, setConsolePanelHeight]);

  // Update nodes with impact overlay
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

    // Get selected node
    const selectedNode = selectedNodeIds[0];

    // Find upstream and downstream nodes
    const upstream = new Set<string>();
    const downstream = new Set<string>();

    // Simple BFS for upstream
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

    // Simple BFS for downstream
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

  const inspectorNode = workspaceNodes.find((n) => n.id === inspectorNodeId);

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Explorer */}
        {!focusMode && explorerPanelVisible && (
          <>
            <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
              <DbtExplorer nodes={workspaceNodes} onHide={toggleExplorerPanel} />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        {/* Center: Canvas */}
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
            {/* Toolbar */}
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

            {/* React Flow Canvas */}
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
                    const type = (node.data as any).type;
                    if (type === 'SOURCE') return '#a855f7';
                    if (type === 'MODEL') return '#3b82f6';
                    if (type === 'TEST') return '#ef4444';
                    return '#6b7280';
                  }}
                  nodeBorderRadius={4}
                  onClick={(event, position) => {
                    // This enables minimap click navigation - React Flow handles it automatically
                  }}
                />
              </ReactFlow>
            </div>
          </div>
        </ResizablePanel>

        {/* Right: Inspector */}
        {!focusMode && inspectorPanelVisible && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
              <InspectorPanel
                node={inspectorNode || null}
                onHide={toggleInspectorPanel}
                userPermissions={userPermissions}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Modals */}
      <PlanPreviewModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        plan={currentPlan}
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

