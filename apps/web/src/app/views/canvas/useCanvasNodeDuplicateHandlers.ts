/** Owned concern: duplicate visible nodes through a semantic command and the draft graph lifecycle. */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeDuplicateContracts } from './canvasGraphHandlerContracts';
import { resolveCanvasNodeDuplicateTransaction } from './canvasDuplicateNodeCommand';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasNodeDuplicateHandlersArgs = CanvasNodeDuplicateContracts;

type UseCanvasNodeDuplicateHandlersResult = {
  handleDuplicateNode: (nodeId: string) => void;
};

export function useCanvasNodeDuplicateHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeDuplicateHandlersArgs): UseCanvasNodeDuplicateHandlersResult {
  const { canonicalNodesById, nodes } = state;
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled, graphStrategy } = policy;
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const transaction = resolveCanvasNodeDuplicateTransaction({
        nodeId,
        sourceCanonicalNode: canonicalNodesById.get(nodeId) ?? null,
        existingNodes: latestNodesRef.current,
        graphStrategy,
        columnLevelLineageEnabled,
      });

      switch (transaction.outcome) {
        case 'missing_source_node':
          toast.error(canvasViewCopy.nodeNotFoundInGraphMessage);
          return;
        case 'rejected':
          toast.error(transaction.reason);
          return;
        case 'noop':
          toast.info(transaction.reason);
          return;
        case 'added':
          latestNodesRef.current = transaction.nextNodes;
          setNodes(transaction.nextNodes);
          setDraftSession((currentSession) =>
            canvasGraphLifecycle.node.admitExplicit(currentSession, transaction.canonicalNode)
          );
          setSelectedNodes([transaction.canonicalNode.id]);
          setInspectorNode(transaction.canonicalNode.id);
          toast.success(formatCanvasNodeAddedMessage(transaction.canonicalNode.name));
      }
    },
    [
      canEditEdges,
      canonicalNodesById,
      columnLevelLineageEnabled,
      graphStrategy,
      setDraftSession,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return {
    handleDuplicateNode,
  };
}
