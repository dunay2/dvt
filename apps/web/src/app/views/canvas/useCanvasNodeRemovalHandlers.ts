import { useCallback } from 'react';
import { toast } from 'sonner';

import { removeNodeFromCanvasWorkingSet } from './canvasInteractionCommands';
import { canvasViewCopy } from './copy';
import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

type UseCanvasNodeRemovalHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  | 'draftSession'
  | 'nodes'
  | 'edges'
  | 'selectedNodeIds'
  | 'inspectorNodeId'
  | 'canEditEdges'
  | 'setNodes'
  | 'setEdges'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

type UseCanvasNodeRemovalHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'handleRemoveNode'
>;

export function useCanvasNodeRemovalHandlers({
  draftSession,
  nodes,
  edges,
  selectedNodeIds,
  inspectorNodeId,
  canEditEdges,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: UseCanvasNodeRemovalHandlersArgs): UseCanvasNodeRemovalHandlersResult {
  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      // React Flow may still be processing the click that requested deletion.
      // Deferring disposal avoids stale click/delete races against the inspector state.
      setTimeout(() => {
        const removeResult = removeNodeFromCanvasWorkingSet(
          {
            draftSession,
            nodes,
            edges,
            selectedNodeIds,
            inspectorNodeId,
          },
          nodeId
        );
        if (removeResult.outcome === 'noop') {
          return;
        }

        setNodes(removeResult.state.nodes);
        setEdges(removeResult.state.edges);
        setDraftSession(removeResult.state.draftSession);
        setSelectedNodes(removeResult.state.selectedNodeIds);
        setInspectorNode(removeResult.state.inspectorNodeId);
        toast.success(`Removed ${removeResult.removedNodeName}`);
      }, 0);
    },
    [
      canEditEdges,
      draftSession,
      edges,
      inspectorNodeId,
      nodes,
      selectedNodeIds,
      setDraftSession,
      setEdges,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return {
    handleRemoveNode,
  };
}
