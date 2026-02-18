import { useState, useCallback, useMemo } from 'react';
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
} from '@xyflow/react';
import dagre from 'dagre';
import { toast } from 'sonner';
import { useAppStore } from '../stores/appStore';
import { mockNodes, mockEdges, mockExecutionPlan } from '../data/mockDbtData';
import { DbtNode, DbtNodeType } from '../types/dbt';
import DbtExplorer from '../components/DbtExplorer';
import InspectorPanel from '../components/InspectorPanel';
import DbtNodeComponent from '../components/canvas/DbtNodeComponent';
import { PlanPreviewModal, ConfirmEdgeModal } from '../components/Modals';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Maximize,
  ZoomIn,
  ZoomOut,
  GitBranch,
  Play,
  FileCheck,
  Target,
  Columns,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const nodeTypes = {
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
    setCurrentRun,
    userPermissions,
    setConsolePanelHeight,
  } = useAppStore();

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<{
    open: boolean;
    edge: { source: string; target: string; type: string } | null;
  }>({ open: false, edge: null });

  // Convert mock nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return mockNodes.map((node, idx) => ({
      id: node.id,
      type: 'dbtNode',
      position: { x: (idx % 3) * 250, y: Math.floor(idx / 3) * 150 },
      data: {
        name: node.name,
        type: node.type,
        status: node.status,
        lastDuration: node.lastDuration,
        lastCost: node.lastCost,
      },
    }));
  }, []);

  const initialEdges: Edge[] = useMemo(() => {
    return mockEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6b7280' },
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Find source and target nodes
      const sourceNode = mockNodes.find((n) => n.id === connection.source);
      const targetNode = mockNodes.find((n) => n.id === connection.target);

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
    [edges]
  );

  const confirmEdgeCreation = useCallback(() => {
    const connection = (window as any).__pendingConnection;
    if (connection) {
      setEdges((eds) =>
        addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#6b7280' } }, eds)
      );
      toast.success('Dependency added');
    }
    setConfirmEdgeModal({ open: false, edge: null });
  }, [setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setInspectorNode(node.id);
    },
    [setInspectorNode]
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
    [setNodes]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePlan = useCallback(() => {
    if (!userPermissions.canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }
    setCurrentPlan(mockExecutionPlan);
    setPlanModalOpen(true);
    toast.success('Execution plan created');
  }, [userPermissions, setCurrentPlan]);

  const handleStartRun = useCallback(() => {
    if (!userPermissions.canRun) {
      toast.error('You do not have permission to start runs');
      return;
    }
    // This would normally start a run via API
    toast.success('Run started');
    setPlanModalOpen(false);
    setConsolePanelHeight(200);
  }, [userPermissions, setConsolePanelHeight]);

  // Update nodes with impact overlay
  const nodesWithImpact = useMemo(() => {
    if (!impactOverlayEnabled || selectedNodeIds.length === 0) {
      return nodes;
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
      },
    }));
  }, [nodes, edges, impactOverlayEnabled, selectedNodeIds]);

  const inspectorNode = mockNodes.find((n) => n.id === inspectorNodeId);

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Explorer */}
        {!focusMode && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <DbtExplorer nodes={mockNodes} />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        {/* Center: Canvas */}
        <ResizablePanel defaultSize={focusMode ? 100 : 55}>
          <div className="h-full flex flex-col bg-[#1a1d23]">
            {/* Toolbar */}
            <div className="h-12 bg-[#0f1116] border-b border-gray-800 flex items-center justify-between px-4">
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
                <Button variant="outline" size="sm" onClick={handlePlan}>
                  <FileCheck className="size-4 mr-2" />
                  Plan
                </Button>
                <Button variant="default" size="sm" onClick={handleStartRun}>
                  <Play className="size-4 mr-2" />
                  Run
                </Button>
              </div>
            </div>

            {/* Selection Bar */}
            {selectedNodeIds.length > 0 && (
              <div className="h-10 bg-blue-900/30 border-b border-blue-700 flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge>{selectedNodeIds.length} selected</Badge>
                  <span className="text-gray-300">
                    {selectedNodeIds
                      .map((id) => mockNodes.find((n) => n.id === id)?.name)
                      .join(', ')}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedNodes([])}>
                  <X className="size-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            {/* React Flow Canvas */}
            <div className="flex-1" onDrop={handleDrop} onDragOver={handleDragOver}>
              <ReactFlow
                nodes={nodesWithImpact}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-[#1a1d23]"
              >
                <Background color="#374151" gap={20} />
                <Controls className="bg-[#0f1116] border-gray-700" />
                <MiniMap
                  className="bg-[#0f1116] border border-gray-700"
                  nodeColor={(node) => {
                    const type = (node.data as any).type;
                    if (type === 'SOURCE') return '#a855f7';
                    if (type === 'MODEL') return '#3b82f6';
                    if (type === 'TEST') return '#ef4444';
                    return '#6b7280';
                  }}
                />
              </ReactFlow>
            </div>
          </div>
        </ResizablePanel>

        {/* Right: Inspector */}
        {!focusMode && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <InspectorPanel
                node={inspectorNode || null}
                onClose={() => setInspectorNode(null)}
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
        plan={mockExecutionPlan}
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
