/** Owned concern: admit catalog-created authoring nodes through the draft graph lifecycle. */
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import type {
  CanvasAuthoringNodeCreationContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';
import { resolveCanvasNodeAdmissionTransaction } from './canvasNodeAdmissionTransaction';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasAuthoringNodeCreationHandlersArgs = CanvasAuthoringNodeCreationContracts;

type UseCanvasAuthoringNodeCreationHandlersResult = {
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
};

export function useCanvasAuthoringNodeCreationHandlers({
  state,
  effects,
  policy,
}: UseCanvasAuthoringNodeCreationHandlersArgs): UseCanvasAuthoringNodeCreationHandlersResult {
  const { draftSession, nodes } = state;
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled } = policy;
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;

  const handleCreateAuthoringNode = useCallback<CreateCanvasAuthoringNode>(
    (registration) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const { canonicalNode, position } = buildAuthoringNodeCommand(
        registration,
        latestNodesRef.current
      );
      const transaction = resolveCanvasNodeAdmissionTransaction({
        canonicalNode,
        draftSession,
        existingNodes: latestNodesRef.current,
        position,
        columnLevelLineageEnabled,
      });

      switch (transaction.outcome) {
        case 'noop':
          toast.info(transaction.reason);
          return;
        case 'added':
          latestNodesRef.current = transaction.nodes;
          setNodes(transaction.nodes);
          setDraftSession(transaction.draftSession);
          setSelectedNodes([transaction.canonicalNode.id]);
          setInspectorNode(transaction.canonicalNode.id);
          toast.success(formatCanvasNodeAddedMessage(transaction.canonicalNode.name));
      }
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      draftSession,
      setDraftSession,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return { handleCreateAuthoringNode };
}
