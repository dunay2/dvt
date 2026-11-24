/** Owned concern: compose graph interaction handlers over the local contract-builder component. */

import { useCallback } from 'react';

import type {
  CanvasGraphInteractionContracts,
  CanvasGraphInteractionState,
  CanvasGraphInteractionEffects,
  CanvasGraphInteractionPolicy,
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
import { useCanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';
import { setCanvasColumnDisclosure } from './useCanvasZoomColumnDisclosure';

export function useCanvasGraphHandlers(
  params: UseCanvasGraphHandlersParams
): UseCanvasGraphHandlersResult {
  const { setNodes, runDraftSessionCommand } = params;
  const interactionContracts = buildCanvasGraphInteractionContracts(params);
  const { state: interactionState } = interactionContracts;
  const columnCommandRunner = useCanvasColumnAuthoringCommandRunner({
    state: interactionState,
    effects: { runDraftSessionCommand },
  });
  const edgeAuthoringHandlers = useCanvasEdgeAuthoringHandlers(
    canvasGraphHandlerContractBuilders.edgeAuthoring(interactionContracts),
    columnCommandRunner
  );
  const algebraicComposition = useCanvasAlgebraicCompositionHandler(interactionContracts);
  const handleColumnDisclosureChange = useCallback(
    (nodeId: string, expanded: boolean) => {
      setNodes((currentNodes) => setCanvasColumnDisclosure(currentNodes, nodeId, expanded));
    },
    [setNodes]
  );
  const handleColumnViewChange = useCallback(
    (nodeId: string, view: 'input' | 'output') => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, columnView: view } } : node
        )
      );
    },
    [setNodes]
  );
  const handleAddCanvasCalculatedColumn = columnCommandRunner.addCalculated;
  const handleApplyCanvasStructuredField = columnCommandRunner.applyStructured;
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
    handleColumnViewChange,
    handleApplyCanvasStructuredField,
    handleAddCanvasCalculatedColumn,
    resolveCanvasAlgebraicCompositionOperations: algebraicComposition.resolveOperations,
    handleComposeCanvasNodes: algebraicComposition.composeNodes,
  };
}

function buildCanvasGraphInteractionContracts(
  p: UseCanvasGraphHandlersParams
): CanvasGraphInteractionContracts {
  const { gridSize = 20, canvasSnapToGrid = false } = p;
  const interactionState: CanvasGraphInteractionState = {
    canonicalNodesById: p.canonicalNodesById,
    draftSession: p.draftSession,
    nodes: p.nodes,
    edges: p.edges,
    selectedNodeIds: p.selectedNodeIds,
    inspectorNodeId: p.inspectorNodeId,
    focusMode: p.focusMode,
    inspectorPanelVisible: p.inspectorPanelVisible,
  };
  const interactionEffects: CanvasGraphInteractionEffects = {
    setNodes: p.setNodes,
    setEdges: p.setEdges,
    setDraftSession: p.setDraftSession,
    setSelectedNodes: p.setSelectedNodes,
    reconcileSelectionAfterNodeRemoval: p.reconcileSelectionAfterNodeRemoval,
    setInspectorNode: p.setInspectorNode,
    toggleInspectorPanel: p.toggleInspectorPanel,
    onLayoutComplete: p.onLayoutComplete,
  };
  const interactionPolicy: CanvasGraphInteractionPolicy = {
    graphStrategy: p.graphStrategy,
    canEditEdges: p.canEditEdges,
    gridSize,
    canvasSnapToGrid,
    runtimeCapabilities: p.runtimeCapabilities,
    allowsCanonicalNode: p.allowsCanonicalNode,
    columnLevelLineageEnabled: p.columnLevelLineageEnabled,
  };
  return { state: interactionState, effects: interactionEffects, policy: interactionPolicy };
}
