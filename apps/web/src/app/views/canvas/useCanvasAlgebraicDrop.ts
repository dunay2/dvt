/** Owned concern: project algebraic drop intent from React Flow node geometry. */
import type { Node } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  CanvasAlgebraicCompositionIdentity,
  CanvasAlgebraicCompositionOperation,
} from './canvasAlgebraicComposition';

type AlgebraicNodeData = Record<string, unknown> & {
  resolveAlgebraicCompositionOperations?: (
    identity: CanvasAlgebraicCompositionIdentity
  ) => CanvasAlgebraicCompositionOperation[];
  onComposeCanvasNodes?: (
    identity: CanvasAlgebraicCompositionIdentity & {
      operation: CanvasAlgebraicCompositionOperation;
    }
  ) => void;
};

export type CanvasAlgebraicDropHover = {
  targetNodeId: string;
  operations: CanvasAlgebraicCompositionOperation[];
  activeOperation: CanvasAlgebraicCompositionOperation;
};

function dimension(node: Node, axis: 'width' | 'height'): number {
  return node.measured?.[axis] ?? node[axis] ?? 0;
}

export function resolveCanvasAlgebraicDropHover(
  draggedNode: Node,
  nodes: readonly Node[]
): CanvasAlgebraicDropHover | null {
  const center = {
    x: draggedNode.position.x + dimension(draggedNode, 'width') / 2,
    y: draggedNode.position.y + dimension(draggedNode, 'height') / 2,
  };
  const target = nodes.find((candidate) => {
    if (candidate.id === draggedNode.id) return false;
    const width = dimension(candidate, 'width');
    const height = dimension(candidate, 'height');
    return (
      center.x >= candidate.position.x &&
      center.x <= candidate.position.x + width &&
      center.y >= candidate.position.y &&
      center.y <= candidate.position.y + height
    );
  });
  if (target == null) return null;
  const data = target.data as AlgebraicNodeData;
  if (typeof data.resolveAlgebraicCompositionOperations !== 'function') return null;
  const identity = { sourceNodeId: draggedNode.id, targetNodeId: target.id };
  const operations = data.resolveAlgebraicCompositionOperations(identity);
  if (operations.length === 0) return null;
  const targetWidth = dimension(target, 'width');
  const activeIndex =
    operations.length === 1 || center.x < target.position.x + targetWidth / 2 ? 0 : 1;
  return {
    targetNodeId: target.id,
    operations,
    activeOperation: operations[activeIndex] ?? operations[0]!,
  };
}

export function useCanvasAlgebraicDrop(nodes: Node[], enabled: boolean) {
  const [hover, setHover] = useState<CanvasAlgebraicDropHover | null>(null);
  const hoverRef = useRef<CanvasAlgebraicDropHover | null>(null);
  const updateHover = useCallback((nextHover: CanvasAlgebraicDropHover | null) => {
    hoverRef.current = nextHover;
    setHover(nextHover);
  }, []);
  const projectedNodes = useMemo(
    () =>
      nodes.map((node) =>
        node.id === hover?.targetNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                algebraicDrop: {
                  operations: hover.operations,
                  activeOperation: hover.activeOperation,
                },
              },
            }
          : node
      ),
    [hover, nodes]
  );
  const handleNodeDrag = useCallback(
    (draggedNode: Node, allNodes: Node[]) => {
      updateHover(enabled ? resolveCanvasAlgebraicDropHover(draggedNode, allNodes) : null);
    },
    [enabled, updateHover]
  );
  const handleNodeDragStop = useCallback(
    (draggedNode: Node, allNodes: Node[]) => {
      const currentHover = hoverRef.current;
      if (currentHover != null) {
        const target = allNodes.find((node) => node.id === currentHover.targetNodeId);
        const compose = (target?.data as AlgebraicNodeData | undefined)?.onComposeCanvasNodes;
        compose?.({
          sourceNodeId: draggedNode.id,
          targetNodeId: currentHover.targetNodeId,
          operation: currentHover.activeOperation,
        });
      }
      updateHover(null);
    },
    [updateHover]
  );
  return { nodes: projectedNodes, handleNodeDrag, handleNodeDragStop };
}
