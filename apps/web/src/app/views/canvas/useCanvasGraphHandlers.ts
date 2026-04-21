import type {
  CanvasGraphInteractionContracts,
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
  CanvasGraphInteractionState,
} from './canvasGraphHandlerContracts';
import {
  buildCanvasEdgeAuthoringContracts,
  buildCanvasLayoutContracts,
  buildCanvasNodeAuthoringContracts,
  buildCanvasSelectionContracts,
} from './canvasGraphHandlerContractBuilders';
import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';
import { useCanvasEdgeAuthoringHandlers } from './useCanvasEdgeAuthoringHandlers';
import { useCanvasLayoutHandlers } from './useCanvasLayoutHandlers';
import { useCanvasNodeAuthoringHandlers } from './useCanvasNodeAuthoringHandlers';
import { useCanvasSelectionHandlers } from './useCanvasSelectionHandlers';

export function useCanvasGraphHandlers({
  graphStrategy,
  canonicalNodesById,
  edges,
  nodes,
  selectedNodeIds,
  inspectorNodeId,
  draftSession,
  canEditEdges,
  focusMode,
  inspectorPanelVisible,
  columnLevelLineageEnabled,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
  toggleInspectorPanel,
  onLayoutComplete,
}: UseCanvasGraphHandlersParams): UseCanvasGraphHandlersResult {
  const interactionState: CanvasGraphInteractionState = {
    canonicalNodesById,
    draftSession,
    nodes,
    edges,
    selectedNodeIds,
    inspectorNodeId,
    focusMode,
    inspectorPanelVisible,
  };
  const interactionEffects: CanvasGraphInteractionEffects = {
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
    toggleInspectorPanel,
    onLayoutComplete,
  };
  const interactionPolicy: CanvasGraphInteractionPolicy = {
    graphStrategy,
    canEditEdges,
    columnLevelLineageEnabled,
  };
  const interactionContracts: CanvasGraphInteractionContracts = {
    state: interactionState,
    effects: interactionEffects,
    policy: interactionPolicy,
  };

  const edgeAuthoringHandlers = useCanvasEdgeAuthoringHandlers(
    buildCanvasEdgeAuthoringContracts(interactionContracts)
  );
  const selectionHandlers = useCanvasSelectionHandlers(
    buildCanvasSelectionContracts(interactionContracts)
  );
  const layoutHandlers = useCanvasLayoutHandlers(
    buildCanvasLayoutContracts(interactionContracts)
  );
  const nodeAuthoringHandlers = useCanvasNodeAuthoringHandlers(
    buildCanvasNodeAuthoringContracts(interactionContracts)
  );

  return {
    ...edgeAuthoringHandlers,
    ...selectionHandlers,
    ...layoutHandlers,
    ...nodeAuthoringHandlers,
  };
}
