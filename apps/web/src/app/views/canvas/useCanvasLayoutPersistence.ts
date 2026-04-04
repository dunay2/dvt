import { useCallback } from 'react';

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

type UseCanvasLayoutPersistenceArgs = {
  hasHydrated: boolean;
  isGraphQueryPending: boolean;
  workspaceLayoutKey: string;
  persistedViewport: { x: number; y: number; zoom: number } | null;
  setCanvasViewport: (layoutKey: string, viewport: { x: number; y: number; zoom: number }) => void;
  setCanvasNodePositions: (
    layoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
};

export function useCanvasLayoutPersistence({
  hasHydrated,
  isGraphQueryPending,
  workspaceLayoutKey,
  persistedViewport,
  setCanvasViewport,
  setCanvasNodePositions,
}: UseCanvasLayoutPersistenceArgs) {
  const handleNodePositionsSave = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      if (!hasHydrated || isGraphQueryPending) {
        return;
      }

      setCanvasNodePositions(workspaceLayoutKey, positions);
    },
    [hasHydrated, isGraphQueryPending, setCanvasNodePositions, workspaceLayoutKey]
  );

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
      if (!hasHydrated || isGraphQueryPending) {
        return;
      }

      if (areViewportsEqual(persistedViewport, viewport)) {
        return;
      }

      setCanvasViewport(workspaceLayoutKey, viewport);
    },
    [hasHydrated, isGraphQueryPending, persistedViewport, setCanvasViewport, workspaceLayoutKey]
  );

  return {
    handleNodePositionsSave,
    handleNodeDragStop,
    handleViewportChange,
  };
}
