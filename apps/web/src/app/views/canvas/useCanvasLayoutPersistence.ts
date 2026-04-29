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

function mergeDraggedNodePosition(allNodes: readonly Node[], draggedNode: Node): Node[] {
  const nodesWithDraggedPosition = allNodes.map((node) =>
    node.id === draggedNode.id ? { ...node, position: draggedNode.position } : node
  );

  return allNodes.some((node) => node.id === draggedNode.id)
    ? nodesWithDraggedPosition
    : [...nodesWithDraggedPosition, draggedNode];
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
  hasObservedDrag: boolean;
  hasSettledDrag: boolean;
  nodePositionsChanged: boolean;
  persistedNodePositions: CanvasNodePositions;
  nextNodePositions: CanvasNodePositions;
}): boolean {
  const hasSaveCandidate = args.hasObservedDrag || args.hasSettledDrag || args.nodePositionsChanged;

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
    const nextNodePositions = extractNodePositions(nodes);
    const previousNodePositions = lastNodePositionsRef.current;
    lastNodePositionsRef.current = nextNodePositions;

    if (hasActiveDragFrame(nodes)) {
      observedNodeDragRef.current = true;
      return;
    }

    if (
      !shouldSaveObservedNodePositions({
        hasObservedDrag: observedNodeDragRef.current,
        hasSettledDrag: hasSettledDragFrame(nodes),
        nodePositionsChanged: didNodePositionsChange(previousNodePositions, nextNodePositions),
        persistedNodePositions,
        nextNodePositions,
      })
    ) {
      return;
    }

    saveNodePositions(nextNodePositions);
    observedNodeDragRef.current = false;
  }, [nodes, persistedNodePositions, saveNodePositions]);
}

function useCanvasNodePositionSave({
  canPersistLayout,
  workspaceLayoutKey,
  setCanvasNodePositions,
}: {
  canPersistLayout: boolean;
  workspaceLayoutKey: string;
  setCanvasNodePositions: (layoutKey: string, positions: CanvasNodePositions) => void;
}): SaveCanvasNodePositions {
  return useCallback<SaveCanvasNodePositions>(
    (positions) => {
      if (!canPersistLayout) {
        return;
      }

      setCanvasNodePositions(workspaceLayoutKey, positions);
    },
    [canPersistLayout, setCanvasNodePositions, workspaceLayoutKey]
  );
}

function useCanvasNodePositionPersistence({
  canPersistLayout,
  workspaceLayoutKey,
  nodes,
  persistedNodePositions,
  setCanvasNodePositions,
}: {
  canPersistLayout: boolean;
  workspaceLayoutKey: string;
  nodes: readonly Node[];
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (layoutKey: string, positions: CanvasNodePositions) => void;
}) {
  const handleNodePositionsSave = useCanvasNodePositionSave({
    canPersistLayout,
    workspaceLayoutKey,
    setCanvasNodePositions,
  });

  usePersistSettledNodePositions({
    nodes,
    persistedNodePositions,
    saveNodePositions: handleNodePositionsSave,
  });

  const handleNodeDragStop = useCallback<NonNullable<ReactFlowProps['onNodeDragStop']>>(
    (_event, draggedNode, allNodes) => {
      if (!canPersistLayout) {
        return;
      }

      handleNodePositionsSave(
        extractNodePositions(mergeDraggedNodePosition(allNodes, draggedNode))
      );
    },
    [canPersistLayout, handleNodePositionsSave]
  );

  return {
    handleNodePositionsSave,
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
  const canPersistLayout = hasHydrated && !isGraphQueryPending;
  const { handleNodePositionsSave, handleNodeDragStop } = useCanvasNodePositionPersistence({
    canPersistLayout,
    workspaceLayoutKey,
    nodes,
    persistedNodePositions,
    setCanvasNodePositions,
  });
  const handleViewportChange = useCanvasViewportPersistenceHandler({
    canPersistLayout,
    workspaceLayoutKey,
    persistedViewport,
    setCanvasViewport,
  });

  return {
    handleNodePositionsSave,
    handleNodeDragStop,
    handleViewportChange,
  };
}
