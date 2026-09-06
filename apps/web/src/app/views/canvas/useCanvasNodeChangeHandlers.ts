/** Owned concern: apply node-change fallout through the graph lifecycle component and route-local UI scope. */

import { type NodeChange } from '@xyflow/react';
import { useCallback } from 'react';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeChangeContracts } from './canvasMutationHandlerContracts';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';

type UseCanvasNodeChangeHandlersArgs = CanvasNodeChangeContracts;

type UseCanvasNodeChangeHandlersResult = {
  handleNodesChange: (changes: NodeChange[]) => void;
};

function hasNodeRemoval(changes: readonly NodeChange[]): boolean {
  return changes.some((change) => change.type === 'remove');
}

export function useCanvasNodeChangeHandlers({
  state,
  effects,
}: UseCanvasNodeChangeHandlersArgs): UseCanvasNodeChangeHandlersResult {
  const { graphModel, draftSession, uiScope, selectedNodeIds } = state;
  const { setDraftSession, reconcileSelectionAfterNodeRemoval, setInspectorNode } = effects;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!hasNodeRemoval(changes)) {
        graphModel.setNodes((currentNodes) =>
          canvasGraphLifecycle.node.applyLocalChanges(currentNodes, changes)
        );
        return;
      }

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
        setSelectedNodes: reconcileSelectionAfterNodeRemoval,
        setInspectorNode,
      });
    },
    [
      draftSession,
      graphModel,
      selectedNodeIds,
      setDraftSession,
      setInspectorNode,
      reconcileSelectionAfterNodeRemoval,
      uiScope.inspectorNodeId,
    ]
  );

  return {
    handleNodesChange,
  };
}
