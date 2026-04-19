import { useCallback } from 'react';
import { applyEdgeChanges, type Edge, type EdgeChange } from '@xyflow/react';

import { replaceCanvasVisibleEdges } from './canvasInteractionCommands';
import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';

type UseCanvasEdgeChangeHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  'graphModel' | 'setDraftSession'
>;

export function useCanvasEdgeChangeHandlers({
  graphModel,
  setDraftSession,
}: UseCanvasEdgeChangeHandlersArgs): Pick<CanvasGraphChangeHandlers, 'handleEdgesChange'> {
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const nextEdges = applyEdgeChanges(changes, graphModel.edges);

      graphModel.setEdges(nextEdges);
      setDraftSession((currentSession) =>
        replaceCanvasVisibleEdges(currentSession, nextEdges)
      );
    },
    [graphModel, setDraftSession]
  );

  return {
    handleEdgesChange,
  };
}
