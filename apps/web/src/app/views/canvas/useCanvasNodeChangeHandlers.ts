/** Owned concern: apply node-change fallout through the graph lifecycle component and route-local UI scope. */

import { type Node, type NodeChange } from '@xyflow/react';
import { useCallback } from 'react';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeChangeContracts } from './canvasMutationHandlerContracts';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';

type UseCanvasNodeChangeHandlersArgs = CanvasNodeChangeContracts;

type UseCanvasNodeChangeHandlersResult = {
  handleNodesChange: (changes: NodeChange[]) => void;
};

type CanvasNodePositions = Record<string, { x: number; y: number }>;

function hasNodeRemoval(changes: readonly NodeChange[]): boolean {
  return changes.some((change) => change.type === 'remove');
}

function hasLayoutPersistablePositionChange(changes: readonly NodeChange[]): boolean {
  return changes.some((change) => {
    if (change.type !== 'position') {
      return false;
    }

    return change.dragging === false || (change.dragging === true && change.position != null);
  });
}

function extractCanvasNodePositions(nodes: readonly Node[]): CanvasNodePositions {
  return Object.fromEntries(
    nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
  );
}

export function useCanvasNodeChangeHandlers({
  state,
  effects,
}: UseCanvasNodeChangeHandlersArgs): UseCanvasNodeChangeHandlersResult {
  const { graphModel, draftSession, uiScope, selectedNodeIds } = state;
  const { setDraftSession, setSelectedNodes, setInspectorNode, onLayoutComplete } = effects;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!hasNodeRemoval(changes)) {
        if (hasLayoutPersistablePositionChange(changes)) {
          onLayoutComplete(
            extractCanvasNodePositions(
              canvasGraphLifecycle.node.applyLocalChanges(graphModel.nodes, changes)
            )
          );
        }

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
        setSelectedNodes,
        setInspectorNode,
      });
    },
    [
      draftSession,
      graphModel,
      onLayoutComplete,
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
