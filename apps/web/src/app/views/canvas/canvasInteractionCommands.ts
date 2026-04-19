import type { Edge, Node } from '@xyflow/react';

import {
  addExplicitNode,
  queueExplicitNodeIds,
  removeNode,
  replaceEdges,
  type CanvasDraftSession,
} from './canvasDraftSession';
import { mapCanvasEdgesToDraftEdges } from './canvasGraphChangeRuntime';
import { removeEdgesForNode, removeNodeFromGraph } from './canvasGraphAggregate';

export type CanvasInteractionState = {
  draftSession: CanvasDraftSession;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
};

export type RemoveNodeFromWorkingSetCommandResult =
  | {
      outcome: 'noop';
      state: CanvasInteractionState;
    }
  | {
      outcome: 'removed';
      removedNodeName: string;
      state: CanvasInteractionState;
    };

export function replaceCanvasVisibleEdges(
  draftSession: CanvasDraftSession,
  edges: Edge[]
): CanvasDraftSession {
  return replaceEdges(draftSession, mapCanvasEdgesToDraftEdges(edges));
}

export function admitExplicitCanvasNode(
  draftSession: CanvasDraftSession,
  nodeId: string
): CanvasDraftSession {
  return addExplicitNode(draftSession, nodeId);
}

export function queueImportedCanvasSourceNodes(
  draftSession: CanvasDraftSession,
  nodeIds: string[]
): CanvasDraftSession {
  return queueExplicitNodeIds(draftSession, nodeIds);
}

export function removeNodeFromCanvasWorkingSet(
  state: CanvasInteractionState,
  nodeId: string
): RemoveNodeFromWorkingSetCommandResult {
  const removeResult = removeNodeFromGraph(state.nodes, nodeId);
  if (removeResult.outcome === 'noop') {
    return {
      outcome: 'noop',
      state,
    };
  }

  const nextEdges = removeEdgesForNode(state.edges, nodeId);

  return {
    outcome: 'removed',
    removedNodeName: removeResult.nodeName,
    state: {
      nodes: removeResult.nextNodes,
      edges: nextEdges,
      selectedNodeIds: state.selectedNodeIds.filter((selectedNodeId) => selectedNodeId !== nodeId),
      inspectorNodeId: state.inspectorNodeId === nodeId ? null : state.inspectorNodeId,
      draftSession: replaceCanvasVisibleEdges(removeNode(state.draftSession, nodeId), nextEdges),
    },
  };
}
