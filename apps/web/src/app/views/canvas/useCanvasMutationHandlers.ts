/** Owned concern: compose mutation handlers over the local mutation-contract component. */

import type {
  CanvasMutationContracts,
  CanvasMutationEffects,
  CanvasMutationPolicy,
  CanvasMutationState,
} from './canvasMutationHandlerContracts';
import { canvasMutationHandlerContractBuilders } from './canvasMutationHandlerContractBuilders';
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
  const mutationState: CanvasMutationState = {
    graphModel,
    draftSession,
    uiScope,
    selectedNodeIds,
  };
  const mutationEffects: CanvasMutationEffects = {
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
    showInspectorPanel,
    setCurrentPlan,
  };
  const mutationPolicy: CanvasMutationPolicy = {
    canMutateGraph,
    workspaceLayoutKey,
  };
  const mutationContracts: CanvasMutationContracts = {
    state: mutationState,
    effects: mutationEffects,
    policy: mutationPolicy,
  };

  const graphChangeHandlers = useCanvasGraphChangeHandlers(
    canvasMutationHandlerContractBuilders.graphChange(mutationContracts)
  );
  const sourceImportHandlers = useCanvasSourceImportHandlers(
    canvasMutationHandlerContractBuilders.sourceImport(mutationContracts)
  );

  return {
    ...graphChangeHandlers,
    ...sourceImportHandlers,
  };
}
