import type { UseCanvasMutationHandlersArgs } from './canvasMutationHandlers.types';
import { useCanvasGraphChangeHandlers } from './useCanvasGraphChangeHandlers';
import { useCanvasSourceImportHandlers } from './useCanvasSourceImportHandlers';

export function useCanvasMutationHandlers({
  canMutateGraph,
  workspaceLayoutKey,
  graphModel,
  draftSession,
  uiScope,
  selectedNodeIds,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
  showInspectorPanel,
  setCurrentPlan,
}: UseCanvasMutationHandlersArgs) {
  const graphChangeHandlers = useCanvasGraphChangeHandlers({
    graphModel,
    draftSession,
    uiScope,
    selectedNodeIds,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  });

  const sourceImportHandlers = useCanvasSourceImportHandlers({
    canMutateGraph,
    workspaceLayoutKey,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
    showInspectorPanel,
    setCurrentPlan,
  });

  return {
    ...graphChangeHandlers,
    ...sourceImportHandlers,
  };
}
