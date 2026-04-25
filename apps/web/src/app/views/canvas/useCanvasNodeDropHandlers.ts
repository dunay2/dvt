/** Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../types/canonical';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasNodeDropContracts,
} from './canvasGraphHandlerContracts';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';
import { admitCanonicalNodeToCanvas } from './canvasNodeDropAggregate';
import { mapDroppedCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasNodeDropHandlersArgs = CanvasNodeDropContracts;

type UseCanvasNodeDropHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
};

export function useCanvasNodeDropHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeDropHandlersArgs): UseCanvasNodeDropHandlersResult {
  const { draftSession } = state;
  const { setNodes, setDraftSession } = effects;
  const { graphStrategy, canEditEdges, columnLevelLineageEnabled } = policy;

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const canonicalNode =
        parseCanonicalNodeDragPayload(
          event.dataTransfer.getData(CANONICAL_NODE_DRAG_MIME_TYPE)
        ) ??
        graphStrategy.parseDropPayload(event.dataTransfer);
      if (!canonicalNode) {
        return;
      }

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      setNodes((existingNodes) => {
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
        toast.success(formatCanvasNodeAddedMessage(admission.canonicalNode.name));
        return [...existingNodes, newNode];
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      draftSession.workingSet.visibleNodeIds,
      graphStrategy,
      setDraftSession,
      setNodes,
    ]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    handleDrop,
    handleDragOver,
  };
}
