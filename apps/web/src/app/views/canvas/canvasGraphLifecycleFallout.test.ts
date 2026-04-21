import { describe, expect, it, vi } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';

function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
      signature: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['sink-node'],
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
  };
}

describe('canvasGraphLifecycleFallout', () => {
  it('applies changed graph and draft setters while skipping unchanged ui fallouts', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();
    const sharedEdges: [] = [];
    const currentState = {
      nodes: [],
      edges: sharedEdges,
      draftSession: buildDraftSession(),
      selectedNodeIds: ['sink-node'],
      inspectorNodeId: null,
    };

    applyCanvasGraphLifecycleFallout({
      currentState,
      nextState: {
        nodes: [{ id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } }],
        edges: sharedEdges,
        draftSession: {
          ...buildDraftSession(),
          workingSet: {
            ...buildDraftSession().workingSet,
            visibleNodeIds: ['sink-node', 'other-node'],
          },
        },
        selectedNodeIds: ['sink-node'],
        inspectorNodeId: null,
      },
      setNodes,
      setEdges,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
    });

    expect(setNodes).toHaveBeenCalledWith([
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(setEdges).not.toHaveBeenCalled();
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    expect(setSelectedNodes).not.toHaveBeenCalled();
    expect(setInspectorNode).not.toHaveBeenCalled();
  });

  it('emits selection and inspector fallouts when they change', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();
    const currentState = {
      nodes: [{ id: 'source-node', data: {}, position: { x: 0, y: 0 } }],
      edges: [],
      draftSession: buildDraftSession(),
      selectedNodeIds: ['source-node', 'sink-node'],
      inspectorNodeId: 'source-node',
    };

    applyCanvasGraphLifecycleFallout({
      currentState,
      nextState: {
        ...currentState,
        selectedNodeIds: ['sink-node'],
        inspectorNodeId: null,
      },
      setNodes,
      setEdges,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
    });

    expect(setSelectedNodes).toHaveBeenCalledWith(['sink-node']);
    expect(setInspectorNode).toHaveBeenCalledWith(null);
  });
});
