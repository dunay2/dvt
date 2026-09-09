/** Owned concern: project and persist Source Inspector list order without changing graph truth. */
import { useCallback, useEffect, useMemo } from 'react';

import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { CanvasInspectorListId } from '../../stores/canvasInteractionStore';

export function reconcileCanvasInspectorListOrder(
  persistedOrder: unknown,
  canonicalIds: readonly string[]
): string[] {
  const canonicalIdSet = new Set(canonicalIds);
  const seen = new Set<string>();
  const persistedIds = Array.isArray(persistedOrder)
    ? persistedOrder.filter((id): id is string => {
        if (typeof id !== 'string' || !canonicalIdSet.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
    : [];

  return [...persistedIds, ...canonicalIds.filter((id) => !seen.has(id))];
}

export function reorderCanvasInspectorList(
  orderedIds: readonly string[],
  movedId: string,
  targetId: string,
  placement: 'before' | 'after'
): string[] {
  if (movedId === targetId || !orderedIds.includes(movedId) || !orderedIds.includes(targetId)) {
    return [...orderedIds];
  }

  const next = orderedIds.filter((id) => id !== movedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedId);
  return next;
}

export function useCanvasInspectorListOrder(args: {
  workspaceLayoutKey: string | null;
  nodeId: string;
  listId: CanvasInspectorListId;
  canonicalIds: readonly string[];
}) {
  const persistedOrder = useCanvasInteractionStore((state) =>
    args.workspaceLayoutKey == null
      ? undefined
      : state.canvasLayouts[args.workspaceLayoutKey]?.inspectorListOrdersByNode?.[args.nodeId]?.[
          args.listId
        ]
  );
  const hasHydrated = useCanvasInteractionStore((state) => state._hasHydrated);
  const setCanvasInspectorListOrder = useCanvasInteractionStore(
    (state) => state.setCanvasInspectorListOrder
  );
  const orderedIds = useMemo(
    () => reconcileCanvasInspectorListOrder(persistedOrder, args.canonicalIds),
    [args.canonicalIds, persistedOrder]
  );

  useEffect(() => {
    if (
      !hasHydrated ||
      args.workspaceLayoutKey == null ||
      !Array.isArray(persistedOrder) ||
      (persistedOrder.length === orderedIds.length &&
        persistedOrder.every((id, index) => id === orderedIds[index]))
    ) {
      return;
    }
    setCanvasInspectorListOrder(args.workspaceLayoutKey, args.nodeId, args.listId, orderedIds);
  }, [
    args.listId,
    args.nodeId,
    args.workspaceLayoutKey,
    hasHydrated,
    orderedIds,
    persistedOrder,
    setCanvasInspectorListOrder,
  ]);

  const move = useCallback(
    (movedId: string, targetId: string, placement: 'before' | 'after') => {
      if (!hasHydrated || args.workspaceLayoutKey == null) return;
      const next = reorderCanvasInspectorList(orderedIds, movedId, targetId, placement);
      setCanvasInspectorListOrder(args.workspaceLayoutKey, args.nodeId, args.listId, next);
    },
    [
      args.listId,
      args.nodeId,
      args.workspaceLayoutKey,
      hasHydrated,
      orderedIds,
      setCanvasInspectorListOrder,
    ]
  );

  return {
    orderedIds,
    canPersist: hasHydrated && args.workspaceLayoutKey != null,
    move,
  };
}
