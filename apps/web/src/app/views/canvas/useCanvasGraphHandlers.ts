import { addEdge, type Connection, type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { evaluateConnection } from '../../plugins/contracts/ConnectionRules';
import { getPluginPortMap } from '../../plugins/registry';
import { resolveCanvasEdgeType } from '../../plugins/nodeTypeRegistry';
import {
  CANONICAL_NODE_DRAG_MIME_TYPE,
  type CanonicalNode,
  type CanonicalNodeStatus,
  type CoreNodeRole,
  type PluginNodeKind,
} from '../../types/canonical';
import { getLayoutedElements } from './canvasGraphUtils';
import {
  createCanvasEdgeFromConnection,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvasNodeMapper';
import { guardTransformationConnection } from './transformationConnectionGuard';
import type {
  ConfirmEdgeModalState,
  UseCanvasGraphHandlersParams,
  UseCanvasGraphHandlersResult,
} from './useCanvasGraphHandlers.types';

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

export function useCanvasGraphHandlers({
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
  onLayoutComplete,
}: UseCanvasGraphHandlersParams): UseCanvasGraphHandlersResult {
  const pendingConnectionRef = useRef<Connection | null>(null);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<ConfirmEdgeModalState>({
    open: false,
    edge: null,
  });

  const pluginPortMap = useMemo(() => getPluginPortMap(), []);

  const onConnect = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
    (connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const sourceNode = canonicalNodesById.get(connection.source);
      const targetNode = canonicalNodesById.get(connection.target);
      if (!sourceNode || !targetNode) {
        return;
      }

      const transformationGuard = guardTransformationConnection({
        sourceNode,
        targetNode,
        canonicalNodes: canonicalNodesById.values(),
        edges,
      });
      if (!transformationGuard.allowed) {
        toast.error(transformationGuard.reason);
        return;
      }

      // Convert ReactFlow edges to CanonicalEdge shape for evaluateConnection
      const canonicalEdges = edges.map((e) => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        relation: 'lineage' as const,
      }));

      const result = evaluateConnection(sourceNode, targetNode, canonicalEdges, pluginPortMap);
      if (!result.allowed) {
        toast.error(result.reason);
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
      pendingConnectionRef.current = connection;
    },
    [canonicalNodesById, edges, pluginPortMap]
  );

  const confirmEdgeCreation = useCallback(() => {
    const connection = pendingConnectionRef.current;
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

    pendingConnectionRef.current = null;
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

  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (_event, node) => {
      if (inspectorPanelVisible && !focusMode) {
        setInspectorNode(node.id);
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode]
  );

  const onSelectionChange = useCallback<
    NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>
  >(
    ({ nodes: selectedNodes }) => {
      setSelectedNodes(selectedNodes.map((node) => node.id));
    },
    [setSelectedNodes]
  );
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('Layout applied');
    onLayoutComplete(
      Object.fromEntries(layoutedNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]))
    );
  }, [edges, nodes, onLayoutComplete, setEdges, setNodes]);

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      const canonicalNode =
        parseCanonicalDropPayload(event.dataTransfer) ??
        graphStrategy.parseDropPayload(event.dataTransfer);
      if (!canonicalNode) {
        return;
      }

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode = mapDroppedCanonicalNodeToCanvasNode(
        canonicalNode,
        position,
        columnLevelLineageEnabled
      );

      setNodes((existingNodes) => {
        if (existingNodes.find((node) => node.id === canonicalNode.id)) {
          toast.info('Node already on canvas');
          return existingNodes;
        }
        toast.success(`Added ${canonicalNode.name} to canvas`);
        return [...existingNodes, newNode];
      });
    },
    [columnLevelLineageEnabled, graphStrategy, setNodes]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
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
      inspectorNodeId,
      nodes,
      selectedNodeIds,
      setEdges,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return {
    confirmEdgeModal,
    setConfirmEdgeModal,
    onConnect,
    confirmEdgeCreation,
    handleInspectNode,
    handleNodeClick,
    onSelectionChange,
    handleAutoLayout,
    handleDrop,
    handleDragOver,
    handleToggleNodeSelection,
    handleRemoveNode,
  };
}
