/** Owned concern: apply visible edge-change fallout through the graph lifecycle component. */

import { useCallback } from 'react';
import { type Edge, type EdgeChange } from '@xyflow/react';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasEdgeChangeContracts,
} from './canvasMutationHandlerContracts';
type UseCanvasEdgeChangeHandlersArgs = CanvasEdgeChangeContracts;

type UseCanvasEdgeChangeHandlersResult = {
  handleEdgesChange: (changes: EdgeChange<Edge>[]) => void;
};

export function useCanvasEdgeChangeHandlers({
  state,
  effects,
}: UseCanvasEdgeChangeHandlersArgs): UseCanvasEdgeChangeHandlersResult {
  const { graphModel, draftSession } = state;
  const { setDraftSession } = effects;

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const nextState = canvasGraphLifecycle.edge.applyChanges(
        {
          draftSession,
          nodes: graphModel.nodes,
          edges: graphModel.edges,
          selectedNodeIds: [],
          inspectorNodeId: null,
        },
        changes
      );

      graphModel.setEdges(nextState.edges);
      if (nextState.draftSession !== draftSession) {
        setDraftSession(nextState.draftSession);
      }
    },
    [draftSession, graphModel, setDraftSession]
  );

  return {
    handleEdgesChange,
  };
}
