import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';
import { useCanvasNodeDropHandlers } from './useCanvasNodeDropHandlers';
import { useCanvasNodeRemovalHandlers } from './useCanvasNodeRemovalHandlers';

type UseCanvasNodeAuthoringHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  | 'graphStrategy'
  | 'draftSession'
  | 'nodes'
  | 'edges'
  | 'selectedNodeIds'
  | 'inspectorNodeId'
  | 'canEditEdges'
  | 'columnLevelLineageEnabled'
  | 'setNodes'
  | 'setEdges'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

type UseCanvasNodeAuthoringHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'handleDrop' | 'handleDragOver' | 'handleRemoveNode'
>;

export function useCanvasNodeAuthoringHandlers({
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
}: UseCanvasNodeAuthoringHandlersArgs): UseCanvasNodeAuthoringHandlersResult {
  const nodeDropHandlers = useCanvasNodeDropHandlers({
    graphStrategy,
    canEditEdges,
    columnLevelLineageEnabled,
    setNodes,
    setDraftSession,
  });

  const nodeRemovalHandlers = useCanvasNodeRemovalHandlers({
    draftSession,
    nodes,
    edges,
    selectedNodeIds,
    inspectorNodeId,
    canEditEdges,
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  });

  return {
    ...nodeDropHandlers,
    ...nodeRemovalHandlers,
  };
}
