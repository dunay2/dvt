import { useCallback } from 'react';
import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';

import { removeNodeFromCanvasWorkingSet } from './canvasInteractionCommands';
import { applyCanvasInteractionStateFallout } from './canvasInteractionStateFallout';
import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';

type UseCanvasNodeChangeHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  | 'graphModel'
  | 'draftSession'
  | 'uiScope'
  | 'selectedNodeIds'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

export function useCanvasNodeChangeHandlers({
  graphModel,
  draftSession,
  uiScope,
  selectedNodeIds,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: UseCanvasNodeChangeHandlersArgs): Pick<CanvasGraphChangeHandlers, 'handleNodesChange'> {
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges<Node>(changes, graphModel.nodes);
      const nextNodeIds = new Set(nextNodes.map((node) => node.id));
      const removedNodeIds = graphModel.nodes
        .map((node) => node.id)
        .filter((nodeId) => !nextNodeIds.has(nodeId));

      if (removedNodeIds.length === 0) {
        graphModel.setNodes(nextNodes);
        return;
      }

      let nextInteractionState = {
        draftSession,
        nodes: graphModel.nodes,
        edges: graphModel.edges,
        selectedNodeIds,
        inspectorNodeId: uiScope.inspectorNodeId,
      };

      for (const nodeId of removedNodeIds) {
        const removeResult = removeNodeFromCanvasWorkingSet(nextInteractionState, nodeId);
        nextInteractionState = removeResult.state;
      }

      applyCanvasInteractionStateFallout({
        nextState: nextInteractionState,
        currentUiScope: uiScope,
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
      uiScope.selectedNodeIds,
    ]
  );

  return {
    handleNodesChange,
  };
}
