import { useCallback } from 'react';
import { toast } from 'sonner';

import { getLayoutedElements } from './canvasGraphUtils';
import { canvasViewCopy } from './copy';
import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

type UseCanvasLayoutHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  'canEditEdges' | 'nodes' | 'edges' | 'setNodes' | 'setEdges' | 'onLayoutComplete'
>;

type UseCanvasLayoutHandlersResult = Pick<UseCanvasGraphHandlersResult, 'handleAutoLayout'>;

export function useCanvasLayoutHandlers({
  canEditEdges,
  nodes,
  edges,
  setNodes,
  setEdges,
  onLayoutComplete,
}: UseCanvasLayoutHandlersArgs): UseCanvasLayoutHandlersResult {
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
