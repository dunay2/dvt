/** Owned concern: translate layout requests into projected node and edge repositioning. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import type {
  CanvasLayoutContracts,
} from './canvasGraphHandlerContracts';
import { getLayoutedElements } from './canvasGraphUtils';
import { canvasViewCopy } from './copy';

type UseCanvasLayoutHandlersArgs = CanvasLayoutContracts;

type UseCanvasLayoutHandlersResult = {
  handleAutoLayout: () => void;
};

export function useCanvasLayoutHandlers({
  state,
  effects,
  policy,
}: UseCanvasLayoutHandlersArgs): UseCanvasLayoutHandlersResult {
  const { nodes, edges } = state;
  const { setNodes, setEdges, onLayoutComplete } = effects;
  const { canEditEdges } = policy;

  const handleAutoLayout = useCallback(() => {
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    toast.success(canvasViewCopy.layoutAppliedMessage);
    onLayoutComplete(
      Object.fromEntries(layoutedNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]))
    );
  }, [canEditEdges, edges, nodes, onLayoutComplete, setEdges, setNodes]);

  return {
    handleAutoLayout,
  };
}
