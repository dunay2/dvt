import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';
import { useCanvasEdgeChangeHandlers } from './useCanvasEdgeChangeHandlers';
import { useCanvasNodeChangeHandlers } from './useCanvasNodeChangeHandlers';

type UseCanvasGraphChangeHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  | 'graphModel'
  | 'draftSession'
  | 'uiScope'
  | 'selectedNodeIds'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

export function useCanvasGraphChangeHandlers({
  graphModel,
  draftSession,
  uiScope,
  selectedNodeIds,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: UseCanvasGraphChangeHandlersArgs): CanvasGraphChangeHandlers {
  const nodeChangeHandlers = useCanvasNodeChangeHandlers({
    graphModel,
    draftSession,
    uiScope,
    selectedNodeIds,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  });

  const edgeChangeHandlers = useCanvasEdgeChangeHandlers({
    graphModel,
    setDraftSession,
  });

  return {
    ...nodeChangeHandlers,
    ...edgeChangeHandlers,
  };
}
