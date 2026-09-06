/** Owned concern: persist Canvas viewport and node-layout observations after route readiness. */

import type { Node, ReactFlowProps } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';

type CanvasViewport = { x: number; y: number; zoom: number };
type CanvasNodePosition = { x: number; y: number };
type CanvasNodePositions = Record<string, CanvasNodePosition>;
type SaveCanvasNodePositions = (positions: CanvasNodePositions) => void;

function areViewportsEqual(left: CanvasViewport | null, right: CanvasViewport | null): boolean {
  if (left == null && right == null) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

type UseCanvasLayoutPersistenceArgs = {
  hasHydrated: boolean;
  isGraphQueryPending: boolean;
  workspaceLayoutKey: string;
  nodes: readonly Node[];
  persistedViewport: CanvasViewport | null;
  persistedNodePositions: CanvasNodePositions;
  setCanvasViewport: (layoutKey: string, viewport: CanvasViewport) => void;
  setCanvasNodePositions: (layoutKey: string, positions: CanvasNodePositions) => void;
};

function extractNodePositions(nodes: readonly Node[]): CanvasNodePositions {
  return Object.fromEntries(
    nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
  );
}

function extractFinalNodePositions(
  nodes: readonly Node[],
  draggedNode: Node,
  draggedNodes: readonly Node[]
): CanvasNodePositions {
  const positions = extractNodePositions(nodes);
  for (const node of draggedNodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  positions[draggedNode.id] = { x: draggedNode.position.x, y: draggedNode.position.y };
  return positions;
}

function hasSettledDragFrame(nodes: readonly Node[]): boolean {
  return nodes.some((node) => node.dragging === false);
}

function hasActiveDragFrame(nodes: readonly Node[]): boolean {
  return nodes.some((node) => node.dragging === true);
}

function areNodePositionsEqual(left: CanvasNodePositions, right: CanvasNodePositions): boolean {
  const leftEntries = Object.entries(left);

  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([nodeId, position]) => {
      const nextPosition = right[nodeId];

      return position.x === nextPosition?.x && position.y === nextPosition?.y;
    })
  );
}

function didNodePositionsChange(
  previousNodePositions: CanvasNodePositions | null,
  nextNodePositions: CanvasNodePositions
): boolean {
  return (
    previousNodePositions != null &&
    !areNodePositionsEqual(previousNodePositions, nextNodePositions)
  );
}

function shouldSaveObservedNodePositions(args: {
  hasSettledDrag: boolean;
  nodePositionsChanged: boolean;
  persistedNodePositions: CanvasNodePositions;
  nextNodePositions: CanvasNodePositions;
}): boolean {
  const hasSaveCandidate = args.hasSettledDrag || args.nodePositionsChanged;

  return (
    hasSaveCandidate && !areNodePositionsEqual(args.persistedNodePositions, args.nextNodePositions)
  );
}

function usePersistSettledNodePositions({
  nodes,
  persistedNodePositions,
  saveNodePositions,
}: {
  nodes: readonly Node[];
  persistedNodePositions: CanvasNodePositions;
  saveNodePositions: SaveCanvasNodePositions;
}) {
  const observedNodeDragRef = useRef(false);
  const lastNodePositionsRef = useRef<CanvasNodePositions | null>(null);

  useEffect(() => {
    if (hasActiveDragFrame(nodes)) {
      observedNodeDragRef.current = true;
      return;
    }

    const nextNodePositions = extractNodePositions(nodes);
    const previousNodePositions = lastNodePositionsRef.current;
    lastNodePositionsRef.current = nextNodePositions;

    if (observedNodeDragRef.current) {
      observedNodeDragRef.current = false;
      return;
    }

    if (
      !shouldSaveObservedNodePositions({
        hasSettledDrag: hasSettledDragFrame(nodes),
        nodePositionsChanged: didNodePositionsChange(previousNodePositions, nextNodePositions),
        persistedNodePositions,
        nextNodePositions,
      })
    ) {
      return;
    }

    saveNodePositions(nextNodePositions);
  }, [nodes, persistedNodePositions, saveNodePositions]);
}

function useCanvasNodePositionSave({
  canPersistNodePositions,
  workspaceLayoutKey,
  setCanvasNodePositions,
}: {
  canPersistNodePositions: boolean;
  workspaceLayoutKey: string;
  setCanvasNodePositions: (layoutKey: string, positions: CanvasNodePositions) => void;
}): SaveCanvasNodePositions {
  return useCallback<SaveCanvasNodePositions>(
    (positions) => {
      if (!canPersistNodePositions) {
        return;
      }

      setCanvasNodePositions(workspaceLayoutKey, positions);
    },
    [canPersistNodePositions, setCanvasNodePositions, workspaceLayoutKey]
  );
}

function useCanvasNodePositionPersistence({
  canPersistNodePositions,
  workspaceLayoutKey,
  nodes,
  persistedNodePositions,
  setCanvasNodePositions,
}: {
  canPersistNodePositions: boolean;
  workspaceLayoutKey: string;
  nodes: readonly Node[];
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (layoutKey: string, positions: CanvasNodePositions) => void;
}) {
  const pendingNodePositionsRef = useRef<CanvasNodePositions | null>(null);
  const handleNodePositionsSave = useCanvasNodePositionSave({
    canPersistNodePositions,
    workspaceLayoutKey,
    setCanvasNodePositions,
  });
  const saveOrQueueNodePositions = useCallback<SaveCanvasNodePositions>(
    (positions) => {
      if (!canPersistNodePositions) {
        pendingNodePositionsRef.current = positions;
        return;
      }

      pendingNodePositionsRef.current = null;
      handleNodePositionsSave(positions);
    },
    [canPersistNodePositions, handleNodePositionsSave]
  );

  useEffect(() => {
    if (!canPersistNodePositions || pendingNodePositionsRef.current == null) {
      return;
    }

    const pendingNodePositions = pendingNodePositionsRef.current;
    pendingNodePositionsRef.current = null;
    handleNodePositionsSave(pendingNodePositions);
  }, [canPersistNodePositions, handleNodePositionsSave]);

  usePersistSettledNodePositions({
    nodes,
    persistedNodePositions,
    saveNodePositions: saveOrQueueNodePositions,
  });

  const handleNodeDrag = useCallback<NonNullable<ReactFlowProps['onNodeDrag']>>(
    () => undefined,
    []
  );

  const handleNodeDragStop = useCallback<NonNullable<ReactFlowProps['onNodeDragStop']>>(
    (_event, draggedNode, draggedNodes) => {
      saveOrQueueNodePositions(extractFinalNodePositions(nodes, draggedNode, draggedNodes));
    },
    [nodes, saveOrQueueNodePositions]
  );

  return {
    handleNodePositionsSave: saveOrQueueNodePositions,
    handleNodeDrag,
    handleNodeDragStop,
  };
}

function useCanvasViewportPersistenceHandler({
  canPersistLayout,
  workspaceLayoutKey,
  persistedViewport,
  setCanvasViewport,
}: {
  canPersistLayout: boolean;
  workspaceLayoutKey: string;
  persistedViewport: CanvasViewport | null;
  setCanvasViewport: (layoutKey: string, viewport: CanvasViewport) => void;
}) {
  return useCallback(
    (viewport: CanvasViewport) => {
      if (!canPersistLayout) {
        return;
      }

      if (areViewportsEqual(persistedViewport, viewport)) {
        return;
      }

      setCanvasViewport(workspaceLayoutKey, viewport);
    },
    [canPersistLayout, persistedViewport, setCanvasViewport, workspaceLayoutKey]
  );
}

export function useCanvasLayoutPersistence({
  hasHydrated,
  isGraphQueryPending,
  workspaceLayoutKey,
  nodes,
  persistedViewport,
  persistedNodePositions,
  setCanvasViewport,
  setCanvasNodePositions,
}: UseCanvasLayoutPersistenceArgs) {
  const canPersistNodePositions = hasHydrated;
  const canPersistViewport = hasHydrated && !isGraphQueryPending;
  const { handleNodePositionsSave, handleNodeDrag, handleNodeDragStop } =
    useCanvasNodePositionPersistence({
      canPersistNodePositions,
      workspaceLayoutKey,
      nodes,
      persistedNodePositions,
      setCanvasNodePositions,
    });
  const handleViewportChange = useCanvasViewportPersistenceHandler({
    canPersistLayout: canPersistViewport,
    workspaceLayoutKey,
    persistedViewport,
    setCanvasViewport,
  });

  return {
    handleNodePositionsSave,
    handleNodeDrag,
    handleNodeDragStop,
    handleViewportChange,
  };
}
