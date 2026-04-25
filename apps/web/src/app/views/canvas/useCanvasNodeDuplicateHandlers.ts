/** Owned concern: duplicate visible nodes through a semantic command and the draft graph lifecycle. */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeDuplicateContracts } from './canvasGraphHandlerContracts';
import { resolveCanvasNodeDuplicateTransaction } from './canvasDuplicateNodeCommand';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';
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
  const { canonicalNodesById, draftSession, nodes } = state;
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled } = policy;
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
        visibleNodeIds: draftSession.workingSet.visibleNodeIds,
      });

      switch (transaction.outcome) {
        case 'missing_source_node':
          toast.error(canvasViewCopy.nodeNotFoundInGraphMessage);
          return;
        case 'noop':
          toast.info(transaction.reason);
          return;
        case 'added':
          latestNodesRef.current = [
            ...latestNodesRef.current,
            mapDroppedCanonicalNodeToCanvasNode(
              transaction.canonicalNode,
              transaction.position,
              columnLevelLineageEnabled
            ),
          ];
          setNodes(latestNodesRef.current);
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
      draftSession.workingSet.visibleNodeIds,
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
