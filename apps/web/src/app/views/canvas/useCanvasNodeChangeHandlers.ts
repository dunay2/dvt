import { useCallback } from 'react';
import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';

import { removeNode, replaceEdges } from './canvasDraftSession';
import { areNodeIdsEqual } from './canvasDraftScope';
import { mapCanvasEdgesToDraftEdges } from './canvasGraphChangeRuntime';
import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';

type UseCanvasNodeChangeHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  | 'graphModel'
  | 'uiScope'
  | 'selectedNodeIds'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
>;

export function useCanvasNodeChangeHandlers({
  graphModel,
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
      const nextEdges = removedNodeIds.length
        ? graphModel.edges.filter(
            (edge) => nextNodeIds.has(edge.source) && nextNodeIds.has(edge.target)
          )
        : graphModel.edges;

      graphModel.setNodes(nextNodes);
      if (removedNodeIds.length === 0) {
        return;
      }

      const nextSelectedNodeIds = selectedNodeIds.filter(
        (nodeId) => !removedNodeIds.includes(nodeId)
      );
      graphModel.setEdges(nextEdges);
      if (!areNodeIdsEqual(nextSelectedNodeIds, uiScope.selectedNodeIds)) {
        setSelectedNodes(nextSelectedNodeIds);
      }
      if (uiScope.inspectorNodeId != null && removedNodeIds.includes(uiScope.inspectorNodeId)) {
        setInspectorNode(null);
      }
      setDraftSession((currentSession) => {
        let nextSession = currentSession;
        for (const nodeId of removedNodeIds) {
          nextSession = removeNode(nextSession, nodeId);
        }
        return replaceEdges(nextSession, mapCanvasEdgesToDraftEdges(nextEdges));
      });
    },
    [
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
