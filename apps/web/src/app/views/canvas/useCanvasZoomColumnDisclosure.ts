/** Project temporary column disclosure from the viewport without changing manual preferences. */
import { useStore, type Node } from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import type { CanvasColumnActions } from './canvasNodeInteractionPresentation';

export function useCanvasMaximumZoom(): boolean {
  return useStore(({ transform, maxZoom }) => transform[2] >= maxZoom);
}

export function setCanvasColumnDisclosure(
  nodes: Node[],
  nodeId: string,
  expanded: boolean
): Node[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, columnDisclosureExpanded: expanded } }
      : node
  );
}

export function useCanvasZoomColumnDisclosure(
  nodes: Node[],
  atMaximumZoom: boolean,
  onManualDisclosureChange: CanvasColumnActions['onColumnDisclosureChange'],
  scopeKey?: string
) {
  const [overrides, setOverrides] = useState(() => ({
    scopeKey,
    closed: new Set<string>(),
  }));
  if (overrides.scopeKey !== scopeKey || (!atMaximumZoom && overrides.closed.size > 0)) {
    setOverrides({ scopeKey, closed: new Set() });
  }

  const projectedNodes = useMemo(
    () =>
      atMaximumZoom
        ? nodes.map((node) =>
            node.data.showColumns === true &&
            node.data.columnDisclosureExpanded !== true &&
            !overrides.closed.has(node.id)
              ? { ...node, data: { ...node.data, columnDisclosureExpanded: true } }
              : node
          )
        : nodes,
    [nodes, atMaximumZoom, overrides.closed]
  );
  const changeAtMaximum = useCallback(
    (nodeId: string, expanded: boolean): void => {
      onManualDisclosureChange?.(nodeId, expanded);
      setOverrides((current) => {
        const closed = new Set(current.closed);
        if (expanded) closed.delete(nodeId);
        else closed.add(nodeId);
        return { ...current, closed };
      });
    },
    [onManualDisclosureChange]
  );
  return {
    nodes: projectedNodes,
    onColumnDisclosureChange: atMaximumZoom ? changeAtMaximum : onManualDisclosureChange,
  };
}
