/** Owned concern: remove nodes through lifecycle semantics and apply coupled route fallout once. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasNodeRemovalContracts,
} from './canvasGraphHandlerContracts';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';
import { canvasViewCopy, formatCanvasNodeRemovedMessage } from './copy';

type UseCanvasNodeRemovalHandlersArgs = CanvasNodeRemovalContracts;

type UseCanvasNodeRemovalHandlersResult = {
  handleRemoveNode: (nodeId: string) => void;
};

export function useCanvasNodeRemovalHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeRemovalHandlersArgs): UseCanvasNodeRemovalHandlersResult {
  const { draftSession, nodes, edges, selectedNodeIds, inspectorNodeId } = state;
  const {
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  } = effects;
  const { canEditEdges } = policy;

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      // React Flow may still be processing the click that requested deletion.
      // Deferring disposal avoids stale click/delete races against the inspector state.
      setTimeout(() => {
        const currentState = {
          draftSession,
          nodes,
          edges,
          selectedNodeIds,
          inspectorNodeId,
        };
        const removeResult = canvasGraphLifecycle.node.remove(currentState, nodeId);
        if (removeResult.outcome === 'noop') {
          return;
        }

        applyCanvasGraphLifecycleFallout({
          currentState,
          nextState: removeResult.state,
          setNodes,
          setEdges,
          setDraftSession,
          setSelectedNodes,
          setInspectorNode,
        });
        toast.success(formatCanvasNodeRemovedMessage(removeResult.removedNodeName));
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
