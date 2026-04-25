/** Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API. */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../types/canonical';
import type { CanvasNodeDropContracts } from './canvasGraphHandlerContracts';
import { resolveCanvasNodeAdmissionTransaction } from './canvasNodeAdmissionTransaction';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';

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
  const { draftSession, nodes } = state;
  const { setNodes, setDraftSession } = effects;
  const { graphStrategy, canEditEdges, columnLevelLineageEnabled } = policy;
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;

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
          toast.success(formatCanvasNodeAddedMessage(transaction.canonicalNode.name));
      }
    },
    [
      canEditEdges,
      columnLevelLineageEnabled,
      draftSession,
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
