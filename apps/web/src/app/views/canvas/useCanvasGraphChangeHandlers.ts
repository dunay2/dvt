import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';
import { useCanvasEdgeChangeHandlers } from './useCanvasEdgeChangeHandlers';
import { useCanvasExplicitNodeAdmission } from './useCanvasExplicitNodeAdmission';
import { useCanvasNodeChangeHandlers } from './useCanvasNodeChangeHandlers';

type UseCanvasGraphChangeHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  | 'graphModel'
  | 'uiScope'
  | 'selectedNodeIds'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

export function useCanvasGraphChangeHandlers({
  graphModel,
  uiScope,
  selectedNodeIds,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: UseCanvasGraphChangeHandlersArgs): CanvasGraphChangeHandlers {
  const nodeChangeHandlers = useCanvasNodeChangeHandlers({
    graphModel,
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

  const explicitNodeAdmission = useCanvasExplicitNodeAdmission({
    setDraftSession,
  });

  return {
    ...nodeChangeHandlers,
    ...edgeChangeHandlers,
    ...explicitNodeAdmission,
  };
}
