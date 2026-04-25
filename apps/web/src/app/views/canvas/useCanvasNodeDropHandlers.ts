/** Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../types/canonical';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasNodeDropContracts,
} from './canvasGraphHandlerContracts';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';
import { dropCanonicalNode } from './canvasNodeDropAggregate';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasNodeDropHandlersArgs = CanvasNodeDropContracts;

type UseCanvasNodeDropHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
};

export function useCanvasNodeDropHandlers({
  effects,
  policy,
}: UseCanvasNodeDropHandlersArgs): UseCanvasNodeDropHandlersResult {
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
        const dropResult = dropCanonicalNode({
          canonicalNode,
          position,
          nodes: existingNodes,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }

        setDraftSession((currentSession) =>
          canvasGraphLifecycle.node.admitExplicit(currentSession, canonicalNode)
        );
        toast.success(formatCanvasNodeAddedMessage(canonicalNode.name));
        return dropResult.nextNodes;
      });
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
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
