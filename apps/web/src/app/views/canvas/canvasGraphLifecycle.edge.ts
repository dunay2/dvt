import { applyEdgeChanges, type Edge, type EdgeChange } from '@xyflow/react';

import {
  canvasDraftSession,
  type CanvasDraftSession,
} from './canvasDraftSession';
import { mapCanvasEdgesToDraftEdges } from './canvasGraphChangeRuntime';
import type {
  CanvasGraphLifecycleEdgeApi,
  CanvasGraphLifecycleState,
} from './canvasGraphLifecycle.types';

// CanvasGraphLifecycle edge API owns visible-edge mutation semantics.
function replaceVisible(
  draftSession: CanvasDraftSession,
  edges: Edge[]
): CanvasDraftSession {
  return canvasDraftSession.workingSet.replaceEdges(
    draftSession,
    mapCanvasEdgesToDraftEdges(edges)
  );
}

function applyChanges(
  state: CanvasGraphLifecycleState,
  changes: EdgeChange<Edge>[]
): CanvasGraphLifecycleState {
  const nextEdges = applyEdgeChanges(changes, state.edges);
  const nextDraftSession = replaceVisible(state.draftSession, nextEdges);

  if (nextEdges === state.edges && nextDraftSession === state.draftSession) {
    return state;
  }

  return {
    ...state,
    edges: nextEdges,
    draftSession: nextDraftSession,
  };
}

export const canvasGraphLifecycleEdge: CanvasGraphLifecycleEdgeApi = {
  applyChanges,
  replaceVisible,
};
