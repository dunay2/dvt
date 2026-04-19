import type { Edge, Node } from '@xyflow/react';
import type { Dispatch, SetStateAction } from 'react';

import { areNodeIdsEqual, type CanvasUiScope } from './canvasDraftScope';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasInteractionState } from './canvasInteractionCommands';

type ApplyCanvasInteractionStateFalloutArgs = {
  nextState: CanvasInteractionState;
  currentUiScope: CanvasUiScope;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export function applyCanvasInteractionStateFallout({
  nextState,
  currentUiScope,
  setNodes,
  setEdges,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
}: ApplyCanvasInteractionStateFalloutArgs): void {
  setNodes(nextState.nodes);
  setEdges(nextState.edges);
  setDraftSession(nextState.draftSession);

  if (!areNodeIdsEqual(nextState.selectedNodeIds, currentUiScope.selectedNodeIds)) {
    setSelectedNodes(nextState.selectedNodeIds);
  }

  if (nextState.inspectorNodeId !== currentUiScope.inspectorNodeId) {
    setInspectorNode(nextState.inspectorNodeId);
  }
}
