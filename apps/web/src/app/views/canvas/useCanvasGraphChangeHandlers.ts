import type { Edge, EdgeChange, NodeChange } from '@xyflow/react';

import type {
  CanvasEdgeChangeContracts,
  CanvasGraphChangeContracts,
  CanvasNodeChangeContracts,
} from './canvasMutationHandlerContracts';
import { useCanvasEdgeChangeHandlers } from './useCanvasEdgeChangeHandlers';
import { useCanvasNodeChangeHandlers } from './useCanvasNodeChangeHandlers';

type UseCanvasGraphChangeHandlersArgs = CanvasGraphChangeContracts;

type UseCanvasGraphChangeHandlersResult = {
  handleNodesChange: (changes: NodeChange[]) => void;
  handleEdgesChange: (changes: EdgeChange<Edge>[]) => void;
};

export function useCanvasGraphChangeHandlers({
  state,
  effects,
}: UseCanvasGraphChangeHandlersArgs): UseCanvasGraphChangeHandlersResult {
  const nodeChangeContracts: CanvasNodeChangeContracts = {
    state,
    effects,
  };
  const nodeChangeHandlers = useCanvasNodeChangeHandlers(nodeChangeContracts);

  const edgeChangeContracts: CanvasEdgeChangeContracts = {
    state: {
      graphModel: state.graphModel,
      draftSession: state.draftSession,
    },
    effects: {
      setDraftSession: effects.setDraftSession,
    },
  };
  const edgeChangeHandlers = useCanvasEdgeChangeHandlers(edgeChangeContracts);

  return {
    ...nodeChangeHandlers,
    ...edgeChangeHandlers,
  };
}
