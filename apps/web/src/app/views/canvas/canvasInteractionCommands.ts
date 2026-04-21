import type { Edge, Node } from '@xyflow/react';

import {
  canvasDraftSession,
  type CanvasDraftSession,
} from './canvasDraftSession';
import { mapCanvasEdgesToDraftEdges } from './canvasGraphChangeRuntime';

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
  return canvasDraftSession.workingSet.replaceEdges(
    draftSession,
    mapCanvasEdgesToDraftEdges(edges)
  );
}

export function admitExplicitCanvasNode(
  draftSession: CanvasDraftSession,
  nodeId: string
): CanvasDraftSession {
  return canvasDraftSession.workingSet.addExplicitNode(draftSession, nodeId);
}

export function queueImportedCanvasSourceNodes(
  draftSession: CanvasDraftSession,
  nodeIds: string[]
): CanvasDraftSession {
  return canvasDraftSession.workingSet.queueExplicitNodeIds(draftSession, nodeIds);
}

type RemoveNodeFromGraphResult =
  | {
      outcome: 'removed';
      nextNodes: Node[];
      nodeName: string;
    }
  | {
      outcome: 'noop';
    };

function removeEdgesForNode(edges: Edge[], nodeId: string): Edge[] {
  return edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
}

function removeNodeFromGraph(nodes: Node[], nodeId: string): RemoveNodeFromGraphResult {
  const nodeToRemove = nodes.find((node) => node.id === nodeId);
  if (!nodeToRemove) {
    return { outcome: 'noop' };
  }

  return {
    outcome: 'removed',
    nextNodes: nodes.filter((node) => node.id !== nodeId),
    nodeName: String(nodeToRemove.data?.name ?? nodeId),
  };
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
      draftSession: replaceCanvasVisibleEdges(
        canvasDraftSession.workingSet.removeNode(state.draftSession, nodeId),
        nextEdges
      ),
    },
  };
}
