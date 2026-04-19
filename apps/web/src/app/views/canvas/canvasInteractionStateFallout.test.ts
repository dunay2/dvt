import { describe, expect, it, vi } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import { applyCanvasInteractionStateFallout } from './canvasInteractionStateFallout';

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

describe('canvasInteractionStateFallout', () => {
  it('applies graph and draft setters while skipping unchanged ui fallouts', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();

    applyCanvasInteractionStateFallout({
      nextState: {
        nodes: [{ id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } }],
        edges: [],
        draftSession: buildDraftSession(),
        selectedNodeIds: ['sink-node'],
        inspectorNodeId: null,
      },
      currentUiScope: {
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
    expect(setEdges).toHaveBeenCalledWith([]);
    expect(setDraftSession).toHaveBeenCalledWith(buildDraftSession());
    expect(setSelectedNodes).not.toHaveBeenCalled();
    expect(setInspectorNode).not.toHaveBeenCalled();
  });

  it('emits selection and inspector fallouts when they change', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();

    applyCanvasInteractionStateFallout({
      nextState: {
        nodes: [{ id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } }],
        edges: [],
        draftSession: buildDraftSession(),
        selectedNodeIds: ['sink-node'],
        inspectorNodeId: null,
      },
      currentUiScope: {
        selectedNodeIds: ['source-node', 'sink-node'],
        inspectorNodeId: 'source-node',
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
