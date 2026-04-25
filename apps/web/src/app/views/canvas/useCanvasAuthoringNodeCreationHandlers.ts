/** Owned concern: admit catalog-created authoring nodes through the draft graph lifecycle. */
import { useCallback } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasAuthoringNodeCreationContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { admitCanonicalNodeToCanvas } from './canvasNodeDropAggregate';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';
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
  const { draftSession } = state;
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled } = policy;

  const handleCreateAuthoringNode = useCallback<CreateCanvasAuthoringNode>(
    (registration) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      setNodes((existingNodes) => {
        const { canonicalNode, position } = buildAuthoringNodeCommand(
          registration,
          existingNodes
        );
        const admission = admitCanonicalNodeToCanvas({
          canonicalNode,
          visibleNodeIds: draftSession.workingSet.visibleNodeIds,
        });

        if (admission.outcome === 'noop') {
          toast.info(admission.reason);
          return existingNodes;
        }

        const newNode = mapDroppedCanonicalNodeToCanvasNode(
          admission.canonicalNode,
          position,
          columnLevelLineageEnabled
        );
        setDraftSession((currentSession) =>
          canvasGraphLifecycle.node.admitExplicit(currentSession, admission.canonicalNode)
        );
        setSelectedNodes([admission.canonicalNode.id]);
        setInspectorNode(admission.canonicalNode.id);
        toast.success(formatCanvasNodeAddedMessage(admission.canonicalNode.name));
        return [...existingNodes, newNode];
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      draftSession.workingSet.visibleNodeIds,
      setDraftSession,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return { handleCreateAuthoringNode };
}
