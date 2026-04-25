/** Owned concern: admit catalog-created authoring nodes through the draft graph lifecycle. */
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import type {
  CanvasAuthoringNodeCreationContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import { useCanvasNodeAdmissionCommandRunner } from './useCanvasNodeAdmissionCommandRunner';

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
  const runAdmissionCommand = useCanvasNodeAdmissionCommandRunner({
    state: {
      draftSession,
      nodes,
    },
    effects: {
      setNodes,
      setDraftSession,
    },
    policy: {
      columnLevelLineageEnabled,
    },
  });

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
      const transaction = runAdmissionCommand({
        canonicalNode,
        position,
        onNoop: (reason) => {
          toast.info(reason);
        },
        onAdded: (addedNode) => {
          setSelectedNodes([addedNode.id]);
          setInspectorNode(addedNode.id);
          toast.success(formatCanvasNodeAddedMessage(addedNode.name));
        },
      });
      if (transaction.outcome === 'added') {
        latestNodesRef.current = transaction.nodes;
      }
    },
    [canEditEdges, runAdmissionCommand, setInspectorNode, setSelectedNodes]
  );

  return { handleCreateAuthoringNode };
}
