/** Owned concern: admit catalog-created authoring nodes through the draft graph lifecycle. */
import { useCallback } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasAuthoringNodeCreationContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { dropCanonicalNode } from './canvasNodeDropAggregate';
import { buildAuthoringNodeCommand } from './canvasAuthoringNodeCommand';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasAuthoringNodeCreationHandlersArgs = CanvasAuthoringNodeCreationContracts;

type UseCanvasAuthoringNodeCreationHandlersResult = {
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
};

export function useCanvasAuthoringNodeCreationHandlers({
  effects,
  policy,
}: UseCanvasAuthoringNodeCreationHandlersArgs): UseCanvasAuthoringNodeCreationHandlersResult {
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled, graphStrategy } = policy;

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
        const dropResult = dropCanonicalNode({
          canonicalNode,
          position,
          nodes: existingNodes,
          graphStrategy,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'rejected') {
          toast.error(dropResult.reason);
          return existingNodes;
        }

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }

        setDraftSession((currentSession) =>
          canvasGraphLifecycle.node.admitExplicit(currentSession, canonicalNode)
        );
        setSelectedNodes([canonicalNode.id]);
        setInspectorNode(canonicalNode.id);
        toast.success(formatCanvasNodeAddedMessage(canonicalNode.name));
        return dropResult.nextNodes;
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      graphStrategy,
      setDraftSession,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return { handleCreateAuthoringNode };
}
