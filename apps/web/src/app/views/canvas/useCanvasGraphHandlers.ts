/** Owned concern: compose graph interaction handlers over the local contract-builder component. */

import type {
  CanvasGraphInteractionContracts,
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
  CanvasGraphInteractionState,
} from './canvasGraphHandlerContracts';
import { canvasGraphHandlerContractBuilders } from './canvasGraphHandlerContractBuilders';
import type {
  UseCanvasGraphHandlersParams,
  UseCanvasGraphHandlersResult,
} from './useCanvasGraphHandlers.types';
import { useCanvasEdgeAuthoringHandlers } from './useCanvasEdgeAuthoringHandlers';
import { useCanvasLayoutHandlers } from './useCanvasLayoutHandlers';
import { useCanvasNodeAuthoringHandlers } from './useCanvasNodeAuthoringHandlers';
import { useCanvasSelectionHandlers } from './useCanvasSelectionHandlers';
import { useCanvasAlgebraicCompositionHandler } from './useCanvasAlgebraicCompositionHandler';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';

export function useCanvasGraphHandlers({
  graphStrategy,
  canonicalNodesById,
  edges,
  nodes,
  selectedNodeIds,
  inspectorNodeId,
  draftSession,
  canEditEdges,
  gridSize = 20,
  canvasSnapToGrid = false,
  runtimeCapabilities,
  allowsCanonicalNode,
  focusMode,
  inspectorPanelVisible,
  columnLevelLineageEnabled,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  reconcileSelectionAfterNodeRemoval,
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
    reconcileSelectionAfterNodeRemoval,
    setInspectorNode,
    toggleInspectorPanel,
    onLayoutComplete,
  };
  const interactionPolicy: CanvasGraphInteractionPolicy = {
    graphStrategy,
    canEditEdges,
    gridSize,
    canvasSnapToGrid,
    runtimeCapabilities,
    allowsCanonicalNode,
    columnLevelLineageEnabled,
  };
  const interactionContracts: CanvasGraphInteractionContracts = {
    state: interactionState,
    effects: interactionEffects,
    policy: interactionPolicy,
  };

  const edgeAuthoringHandlers = useCanvasEdgeAuthoringHandlers(
    canvasGraphHandlerContractBuilders.edgeAuthoring(interactionContracts)
  );
  const algebraicComposition = useCanvasAlgebraicCompositionHandler(interactionContracts);
  const handleColumnDisclosureChange = (nodeId: string, expanded: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, columnDisclosureExpanded: expanded } }
          : node
      )
    );
  };
  const handleApplyCanvasColumnFunction: UseCanvasGraphHandlersResult['handleApplyCanvasColumnFunction'] =
    (identity) => {
      setDraftSession((currentSession) => {
        const result = applyCanvasColumnFunction({
          draftSession: currentSession,
          canonicalNodesById,
          identity,
        });
        return result.outcome === 'applied' ? result.draftSession : currentSession;
      });
    };
  const handleAddCanvasCalculatedColumn: UseCanvasGraphHandlersResult['handleAddCanvasCalculatedColumn'] =
    (request) => {
      setDraftSession((currentSession) => {
        const result = applyCanvasCalculatedColumn({
          draftSession: currentSession,
          canonicalNodesById,
          request,
        });
        return result.outcome === 'applied' ? result.draftSession : currentSession;
      });
    };
  const selectionHandlers = useCanvasSelectionHandlers(
    canvasGraphHandlerContractBuilders.selection(interactionContracts)
  );
  const layoutHandlers = useCanvasLayoutHandlers(
    canvasGraphHandlerContractBuilders.layout(interactionContracts)
  );
  const nodeAuthoringHandlers = useCanvasNodeAuthoringHandlers(
    canvasGraphHandlerContractBuilders.nodeAuthoring(interactionContracts)
  );

  return {
    ...edgeAuthoringHandlers,
    ...selectionHandlers,
    ...layoutHandlers,
    ...nodeAuthoringHandlers,
    handleColumnDisclosureChange,
    handleApplyCanvasColumnFunction,
    handleAddCanvasCalculatedColumn,
    resolveCanvasAlgebraicCompositionOperations: algebraicComposition.resolveOperations,
    handleComposeCanvasNodes: algebraicComposition.composeNodes,
  };
}
