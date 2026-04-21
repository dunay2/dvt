import type { Edge, Node } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';

import { areNodeIdsEqual } from './canvasDraftScope';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasGraphLifecycleState } from './canvasGraphLifecycle';

type ApplyCanvasGraphLifecycleFalloutArgs = {
  currentState: CanvasGraphLifecycleState;
  nextState: CanvasGraphLifecycleState;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export function applyCanvasGraphLifecycleFallout({
  currentState,
  nextState,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: ApplyCanvasGraphLifecycleFalloutArgs): void {
  if (nextState.nodes !== currentState.nodes) {
    setNodes(nextState.nodes);
  }

  if (nextState.edges !== currentState.edges) {
    setEdges(nextState.edges);
  }

  if (nextState.draftSession !== currentState.draftSession) {
    setDraftSession(nextState.draftSession);
  }

  if (!areNodeIdsEqual(nextState.selectedNodeIds, currentState.selectedNodeIds)) {
    setSelectedNodes(nextState.selectedNodeIds);
  }

  if (nextState.inspectorNodeId !== currentState.inspectorNodeId) {
    setInspectorNode(nextState.inspectorNodeId);
  }
}
