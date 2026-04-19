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
  const edgeAuthoringHandlers = useCanvasEdgeAuthoringHandlers({
    canonicalNodesById,
    edges,
    canEditEdges,
    setEdges,
    setDraftSession,
  });

  const selectionHandlers = useCanvasSelectionHandlers({
    canonicalNodesById,
    selectedNodeIds,
    focusMode,
    inspectorPanelVisible,
    setSelectedNodes,
    setInspectorNode,
    toggleInspectorPanel,
  });

  const layoutHandlers = useCanvasLayoutHandlers({
    canEditEdges,
    nodes,
    edges,
    setNodes,
    setEdges,
    onLayoutComplete,
  });

  const nodeAuthoringHandlers = useCanvasNodeAuthoringHandlers({
    graphStrategy,
    draftSession,
    nodes,
    edges,
    selectedNodeIds,
    inspectorNodeId,
    canEditEdges,
    columnLevelLineageEnabled,
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  });

  return {
    ...edgeAuthoringHandlers,
    ...selectionHandlers,
    ...layoutHandlers,
    ...nodeAuthoringHandlers,
  };
}
