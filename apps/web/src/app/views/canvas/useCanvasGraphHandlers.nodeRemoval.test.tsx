// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  buildDraftSession,
  buildCanonicalNode,
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

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
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
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const update = setDraftSession.mock.calls[0]?.[0] as (
      current: ReturnType<typeof buildDraftSession>
    ) => ReturnType<typeof buildDraftSession>;
    expect(update(buildDraftSession())).toEqual(
      expect.objectContaining({
        workingSet: expect.objectContaining({
          visibleNodeIds: ['sink-node'],
          visibleEdges: [],
        }),
      })
    );

    harness.cleanup();
  });

  it('keeps both rapid orphan deletions in the canonical session without a rendered card', async () => {
    vi.useFakeTimers();
    const setDraftSession = vi.fn();
    const initial = {
      ...buildDraftSession(),
      localNodeCatalog: {
        a: buildCanonicalNode('a', 'transform'),
        b: buildCanonicalNode('b', 'transform'),
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      draftSession: initial,
      setDraftSession,
    });
    await harness.render();
    act(() => {
      harness.latest()?.handleRemoveNode('a', 'empty-definition');
      harness.latest()?.handleRemoveNode('b', 'empty-definition');
      vi.runAllTimers();
    });
    const update = setDraftSession.mock.calls.at(-1)?.[0] as (
      current: typeof initial
    ) => typeof initial;
    expect(update(initial).removedDefinitionIds).toEqual(['a', 'b']);
    expect(setDraftSession).toHaveBeenCalledTimes(2);
    expect(harness.setNodes).not.toHaveBeenCalled();
    harness.cleanup();
  });

  it('rejects deletion of an authored draft with an explicit explanation', async () => {
    vi.useFakeTimers();
    const draftSession = {
      ...buildDraftSession(),
      localNodeCatalog: {
        a: {
          ...buildCanonicalNode('a', 'transform'),
          metadata: { config: { materialized: 'table' } },
        },
      },
    };
    const harness = renderGraphHandlersHook({ canEditEdges: true, draftSession });
    await harness.render();
    act(() => {
      harness.latest()?.handleRemoveNode('a', 'empty-definition');
      vi.runAllTimers();
    });
    expect(toastState.error).toHaveBeenCalledWith(expect.stringMatching(/still used|sigue en uso/));
    expect(toastState.success).not.toHaveBeenCalled();
    expect(harness.setDraftSession).not.toHaveBeenCalled();
    harness.cleanup();
  });

  it('cancels deferred removal when its owning hook is disposed', async () => {
    vi.useFakeTimers();
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();
    act(() => {
      harness.latest()?.handleRemoveNode('source-node');
    });
    harness.cleanup();
    act(() => {
      vi.runAllTimers();
    });
    expect(harness.setDraftSession).not.toHaveBeenCalled();
    expect(harness.setNodes).not.toHaveBeenCalled();
  });
});
