import { useCallback, useMemo, useState, useEffect } from 'react';
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
  NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Eye,
  GitBranch,
  Play,
  FileCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCanvasStore, useModalStore } from '../stores';
import { mockNodes, mockExecutionPlan } from '../data/mockData';
import { DbtNode, NodeType } from '../types';
import { DbtNodeComponent } from './canvas/DbtNodeComponent';
import { toast } from 'sonner';

// Convert dbt nodes to React Flow nodes
const convertToFlowNodes = (dbtNodes: DbtNode[]): Node[] => {
  return dbtNodes.map((node, index) => ({
    id: node.id,
    type: 'dbtNode',
    position: { x: 0, y: 0 }, // Will be set by auto-layout
    data: { node },
  }));
};

// Convert dependencies to React Flow edges
const convertToFlowEdges = (dbtNodes: DbtNode[]): Edge[] => {
  const edges: Edge[] = [];

  dbtNodes.forEach((node) => {
    node.dependencies.forEach((depId) => {
      edges.push({
        id: `${depId}-${node.id}`,
        source: depId,
        target: node.id,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    });
  });

  return edges;
};

// Auto-layout using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 150 });

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
};

// Check if edge connection is allowed
const isConnectionAllowed = (
  sourceType: NodeType,
  targetType: NodeType
): { allowed: boolean; reason?: string } => {
  // TEST and EXPOSURE cannot be sources
  if (sourceType === 'TEST' || sourceType === 'EXPOSURE') {
    return { allowed: false, reason: `${sourceType} nodes cannot have outgoing connections` };
  }

  // Allowed connections
  const allowedConnections: Record<NodeType, NodeType[]> = {
    SOURCE: ['MODEL', 'TEST'],
    MODEL: ['MODEL', 'TEST', 'EXPOSURE', 'METRIC'],
    SEED: ['MODEL'],
    SNAPSHOT: ['MODEL'],
    TEST: [],
    EXPOSURE: [],
    METRIC: ['EXPOSURE'],
    MACRO: [],
  };

  if (!allowedConnections[sourceType]?.includes(targetType)) {
    return {
      allowed: false,
      reason: `Cannot connect ${sourceType} to ${targetType}`,
    };
  }

  return { allowed: true };
};

export function GraphCanvas() {
  const { selectedNodeIds, impactOverlayActive, toggleImpactOverlay, setSelectedNodeIds } =
    useCanvasStore();

  const { openPlanPreview, openConfirmEdge } = useModalStore();

  const initialNodes = useMemo(() => convertToFlowNodes(mockNodes), []);
  const initialEdges = useMemo(() => convertToFlowEdges(mockNodes), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Apply auto-layout on mount
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, []);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      dbtNode: DbtNodeComponent,
    }),
    []
  );

  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('Auto-layout applied');
  };

  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  };

  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      const sourceType = (sourceNode.data.node as DbtNode).type;
      const targetType = (targetNode.data.node as DbtNode).type;

      const validation = isConnectionAllowed(sourceType, targetType);

      if (!validation.allowed) {
        toast.error(validation.reason || 'Connection not allowed');
        return;
      }

      // Determine semantic
      let semantic = '';
      if (sourceType === 'SOURCE' && targetType === 'MODEL') {
        semantic = 'Add source() dependency?';
      } else if (sourceType === 'MODEL' && targetType === 'MODEL') {
        semantic = 'Add ref() dependency?';
      } else if (sourceType === 'MODEL' && targetType === 'TEST') {
        semantic = 'Attach test to model?';
      } else {
        semantic = 'Create dependency?';
      }

      openConfirmEdge(connection.source!, connection.target!, semantic);
    },
    [nodes, openConfirmEdge]
  );

  const handlePlan = () => {
    openPlanPreview(mockExecutionPlan);
  };

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/json');
      if (!data) return;

      const node = JSON.parse(data) as DbtNode;

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: node.id,
        type: 'dbtNode',
        position,
        data: { node },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success(`Added ${node.name} to canvas`);
    },
    [reactFlowInstance, setNodes]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      setSelectedNodeIds(nodes.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background border rounded-lg p-2 shadow-lg">
        <Button variant="ghost" size="sm" onClick={handleAutoLayout} title="Auto-layout">
          <LayoutGrid className="h-4 w-4 mr-2" />
          Auto-layout
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleFitView} title="Fit view">
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant={impactOverlayActive ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleImpactOverlay}
          title="Impact Overlay"
        >
          <Eye className="h-4 w-4 mr-2" />
          Impact
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="default" size="sm" onClick={handlePlan} title="Create Plan">
          <FileCheck className="h-4 w-4 mr-2" />
          Plan
        </Button>
      </div>

      {/* Selection Bar */}
      {selectedNodeIds.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-background border rounded-lg p-2 shadow-lg flex items-center gap-2">
          <Badge variant="secondary">{selectedNodeIds.length} selected</Badge>
          <Button variant="ghost" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Run Selection
          </Button>
        </div>
      )}

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onSelectionChange={onSelectionChange}
        fitView
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
