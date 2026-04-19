import { useCallback } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../types/canonical';
import { admitExplicitCanvasNode } from './canvasInteractionCommands';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';
import { dropCanonicalNode } from './canvasNodeDropAggregate';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

type UseCanvasNodeDropHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  | 'graphStrategy'
  | 'canEditEdges'
  | 'columnLevelLineageEnabled'
  | 'setNodes'
  | 'setDraftSession'
>;

type UseCanvasNodeDropHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'handleDrop' | 'handleDragOver'
>;

export function useCanvasNodeDropHandlers({
  graphStrategy,
  canEditEdges,
  columnLevelLineageEnabled,
  setNodes,
  setDraftSession,
}: UseCanvasNodeDropHandlersArgs): UseCanvasNodeDropHandlersResult {
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
          graphStrategy,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }

        if (dropResult.outcome === 'rejected') {
          toast.error(dropResult.reason);
          return existingNodes;
        }

        setDraftSession((currentSession) =>
          admitExplicitCanvasNode(currentSession, canonicalNode.id)
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
