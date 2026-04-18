import { type Connection, type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getPluginPortMap } from '../../plugins/registry';
import {
  CANONICAL_NODE_DRAG_MIME_TYPE,
  type CanonicalNode,
  type CanonicalNodeStatus,
  type CoreNodeRole,
  type PluginNodeKind,
} from '../../types/canonical';
import { getLayoutedElements } from './canvasGraphUtils';
import {
  confirmConnection,
  dropCanonicalNode,
  proposeConnection,
  removeEdgesForNode,
  removeNodeFromGraph,
} from './canvasGraphAggregate';
import { canvasViewCopy } from './copy';
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
  canEditEdges,
  focusMode,
  inspectorPanelVisible,
  columnLevelLineageEnabled,
  setNodes,
  setEdges,
  setSelectedNodes,
  setInspectorNode,
  toggleInspectorPanel,
  onLayoutComplete,
  onNodeAddedToCanvas,
  onNodeRemovedFromCanvas,
  onVisibleEdgesChanged,
}: UseCanvasGraphHandlersParams): UseCanvasGraphHandlersResult {
  const pendingConnectionRef = useRef<Connection | null>(null);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<ConfirmEdgeModalState>({
    open: false,
    edge: null,
  });

  const pluginPortMap = useMemo(() => getPluginPortMap(), []);

  const onConnect = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
    (connection) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const proposedConnection = proposeConnection({
        connection,
        canonicalNodesById,
        edges,
        pluginPortMap,
      });
      if (proposedConnection.outcome === 'rejected') {
        toast.error(proposedConnection.reason);
        return;
      }

      setConfirmEdgeModal({
        open: true,
        edge: {
          source: proposedConnection.sourceNode.name,
          target: proposedConnection.targetNode.name,
          type: proposedConnection.edgeType,
        },
      });
      pendingConnectionRef.current = connection;
    },
    [canEditEdges, canonicalNodesById, edges, pluginPortMap]
  );

  const confirmEdgeCreation = useCallback(() => {
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      pendingConnectionRef.current = null;
      setConfirmEdgeModal({ open: false, edge: null });
      return;
    }

    const connection = pendingConnectionRef.current;
    if (connection?.source && connection.target) {
      setEdges((existingEdges) => {
        const edgeConfirmation = confirmConnection({
          connection,
          canonicalNodesById,
          edges: existingEdges,
          pluginPortMap,
        });
        if (edgeConfirmation.outcome === 'rejected') {
          toast.error(edgeConfirmation.reason);
          return existingEdges;
        }

        const nextEdges = edgeConfirmation.nextEdges;
        onVisibleEdgesChanged?.(
          nextEdges.map((edge) => ({
            sourceId: edge.source,
            targetId: edge.target,
          }))
        );
        toast.success('Dependency added');
        return nextEdges;
      });
    }

    pendingConnectionRef.current = null;
    setConfirmEdgeModal({ open: false, edge: null });
  }, [canEditEdges, canonicalNodesById, onVisibleEdgesChanged, pluginPortMap, setEdges]);

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
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success('Layout applied');
    onLayoutComplete(
      Object.fromEntries(layoutedNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]))
    );
  }, [canEditEdges, edges, nodes, onLayoutComplete, setEdges, setNodes]);

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

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

      setNodes((existingNodes) => {
        const dropResult = dropCanonicalNode({
          canonicalNode,
          position,
          nodes: existingNodes,
          graphStrategy,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }
        if (dropResult.outcome === 'rejected') {
          toast.error(dropResult.reason);
          return existingNodes;
        }

        onNodeAddedToCanvas?.(canonicalNode.id);
        toast.success(`Added ${canonicalNode.name} to canvas`);
        return dropResult.nextNodes;
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      graphStrategy,
      onNodeAddedToCanvas,
      setNodes,
    ]
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
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      setNodes((existingNodes) => {
        const removeResult = removeNodeFromGraph(existingNodes, nodeId);
        if (removeResult.outcome === 'noop') {
          return existingNodes;
        }

        setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));
        onNodeRemovedFromCanvas?.(nodeId);

        if (inspectorNodeId === nodeId) {
          setInspectorNode(null);
        }

        toast.success(`Removed ${removeResult.nodeName}`);
        return removeResult.nextNodes;
      });
      setEdges((existingEdges) => {
        const nextEdges = removeEdgesForNode(existingEdges, nodeId);
        onVisibleEdgesChanged?.(
          nextEdges.map((edge) => ({
            sourceId: edge.source,
            targetId: edge.target,
          }))
        );
        return nextEdges;
      });
    },
    [
      canEditEdges,
      inspectorNodeId,
      onNodeRemovedFromCanvas,
      onVisibleEdgesChanged,
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
