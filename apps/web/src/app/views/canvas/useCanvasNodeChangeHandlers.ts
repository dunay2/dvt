import { type NodeChange } from '@xyflow/react';
import { useCallback } from 'react';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasNodeChangeContracts,
} from './canvasMutationHandlerContracts';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';
type UseCanvasNodeChangeHandlersArgs = CanvasNodeChangeContracts;

type UseCanvasNodeChangeHandlersResult = {
  handleNodesChange: (changes: NodeChange[]) => void;
};

export function useCanvasNodeChangeHandlers({
  state,
  effects,
}: UseCanvasNodeChangeHandlersArgs): UseCanvasNodeChangeHandlersResult {
  const { graphModel, draftSession, uiScope, selectedNodeIds } = state;
  const { setDraftSession, setSelectedNodes, setInspectorNode } = effects;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentState = {
        draftSession,
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds,
        inspectorNodeId: uiScope.inspectorNodeId,
      };
      const nextState = canvasGraphLifecycle.node.applyChanges(currentState, changes);
      applyCanvasGraphLifecycleFallout({
        currentState,
        nextState,
        setNodes: graphModel.setNodes,
        setEdges: graphModel.setEdges,
        setDraftSession,
        setSelectedNodes,
        setInspectorNode,
      });
    },
    [
      draftSession,
      graphModel,
      selectedNodeIds,
      setDraftSession,
      setInspectorNode,
      setSelectedNodes,
      uiScope.inspectorNodeId,
    ]
  );

  return {
    handleNodesChange,
  };
}
