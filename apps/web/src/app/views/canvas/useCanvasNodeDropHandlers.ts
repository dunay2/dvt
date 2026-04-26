/** Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE } from '../../types/canonical';
import type { CanvasNodeDropContracts } from './canvasGraphHandlerContracts';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';
import { useCanvasNodeAdmissionCommandRunner } from './useCanvasNodeAdmissionCommandRunner';

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
  const {
    graphStrategy,
    canEditEdges,
    columnLevelLineageEnabled,
    allowsCanonicalNode,
  } = policy;
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
      allowsCanonicalNode,
    },
  });

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

      runAdmissionCommand({
        canonicalNode,
        position,
        onNoop: (reason) => {
          toast.info(reason);
        },
        onAdded: (addedNode) => {
          toast.success(formatCanvasNodeAddedMessage(addedNode.name));
        },
      });
    },
    [canEditEdges, graphStrategy, runAdmissionCommand]
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
