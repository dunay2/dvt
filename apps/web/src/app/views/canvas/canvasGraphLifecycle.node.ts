import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';

import {
  canvasDraftSession,
  type CanvasDraftSession,
} from './canvasDraftSession';
import { canvasGraphLifecycleEdge } from './canvasGraphLifecycle.edge';
import type {
  CanvasGraphLifecycleNodeApi,
  CanvasGraphLifecycleNodeRemovalResult,
  CanvasGraphLifecycleState,
} from './canvasGraphLifecycle.types';

function applyNodeRemovalState(
  state: CanvasGraphLifecycleState,
  removedNodeIds: string[],
  nextNodes: Node[]
): CanvasGraphLifecycleState {
  const removedNodeIdSet = new Set(removedNodeIds);
  const nextEdges = state.edges.filter(
    (edge) =>
      !removedNodeIdSet.has(edge.source) && !removedNodeIdSet.has(edge.target)
  );

  let nextDraftSession = state.draftSession;
  for (const nodeId of removedNodeIds) {
    nextDraftSession = canvasDraftSession.workingSet.removeNode(nextDraftSession, nodeId);
  }
  nextDraftSession = canvasGraphLifecycleEdge.replaceVisible(nextDraftSession, nextEdges);

  return {
    nodes: nextNodes,
    edges: nextEdges,
    selectedNodeIds: state.selectedNodeIds.filter(
      (selectedNodeId) => !removedNodeIdSet.has(selectedNodeId)
    ),
    inspectorNodeId:
      state.inspectorNodeId != null && removedNodeIdSet.has(state.inspectorNodeId)
        ? null
        : state.inspectorNodeId,
    draftSession: nextDraftSession,
  };
}

function remove(
  state: CanvasGraphLifecycleState,
  nodeId: string
): CanvasGraphLifecycleNodeRemovalResult {
  const nodeToRemove = state.nodes.find((node) => node.id === nodeId);
  if (!nodeToRemove) {
    return {
      outcome: 'noop',
      state,
    };
  }

  return {
    outcome: 'removed',
    removedNodeName: String(nodeToRemove.data?.name ?? nodeId),
    state: applyNodeRemovalState(
      state,
      [nodeId],
      state.nodes.filter((node) => node.id !== nodeId)
    ),
  };
}

function applyChanges(
  state: CanvasGraphLifecycleState,
  changes: NodeChange[]
): CanvasGraphLifecycleState {
  const nextNodes = applyNodeChanges<Node>(changes, state.nodes);
  const nextNodeIds = new Set(nextNodes.map((node) => node.id));
  const removedNodeIds = state.nodes
    .map((node) => node.id)
    .filter((nodeId) => !nextNodeIds.has(nodeId));

  if (removedNodeIds.length === 0) {
    if (nextNodes === state.nodes) {
      return state;
    }

    return {
      ...state,
      nodes: nextNodes,
    };
  }

  return applyNodeRemovalState(state, removedNodeIds, nextNodes);
}

function admitExplicit(
  draftSession: CanvasDraftSession,
  nodeId: string
): CanvasDraftSession {
  return canvasDraftSession.workingSet.addExplicitNode(draftSession, nodeId);
}

function queueImported(
  draftSession: CanvasDraftSession,
  nodeIds: string[]
): CanvasDraftSession {
  return canvasDraftSession.workingSet.queueExplicitNodeIds(draftSession, nodeIds);
}

export const canvasGraphLifecycleNode: CanvasGraphLifecycleNodeApi = {
  applyChanges,
  remove,
  admitExplicit,
  queueImported,
};
