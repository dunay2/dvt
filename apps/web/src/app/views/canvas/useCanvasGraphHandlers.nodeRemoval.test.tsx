// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers node removal', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects node removal when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
      setEdges,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleRemoveNode('source-node');
    });

    expect(toastState.error).toHaveBeenCalledWith('Graph edits are unavailable in this context.');
    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('defers node removal and updates graph, selection, inspector, and draft together', async () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setNodes,
      setEdges,
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['source-node', 'sink-node'],
          visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
          pendingExplicitNodeIds: [],
        },
      },
      selectedNodeIds: ['source-node', 'sink-node'],
      inspectorNodeId: 'source-node',
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleRemoveNode('source-node');
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(setNodes).toHaveBeenCalledWith([
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(setEdges).toHaveBeenCalledWith([]);
    expect(setSelectedNodes).toHaveBeenCalledWith(['sink-node']);
    expect(setInspectorNode).toHaveBeenCalledWith(null);
    expect(setDraftSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workingSet: expect.objectContaining({
          visibleNodeIds: ['sink-node'],
          visibleEdges: [],
        }),
      })
    );

    harness.cleanup();
  });
});
