// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  buildDraftSession,
  rejectGraphHandlerConnectionWith,
  rejectTransformationConnectionWith,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers edge authoring', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects edge creation when graph edits are gated', async () => {
    const harness = renderGraphHandlersHook({ canEditEdges: false });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it('uses a functional edge updater when confirming a connection', async () => {
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setEdges,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
      harness.latest()?.confirmEdgeCreation();
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    const edgeUpdater = setEdges.mock.calls[0]?.[0];
    expect(typeof edgeUpdater).toBe('function');
    const nextEdges = edgeUpdater([]);
    expect(nextEdges).toHaveLength(1);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0](buildDraftSession());
    expect(nextDraftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'sink-node' },
    ]);

    harness.cleanup();
  });

  it('formats cross-plugin bridge rejections at the adapter boundary', async () => {
    rejectGraphHandlerConnectionWith({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dbt',
      sourceRole: 'input',
      targetPluginId: 'monitoring',
      targetRole: 'output',
    });
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(
      'No compatible data port bridge between dbt (input) and monitoring (output).'
    );
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it('formats transformation guard rejections at the adapter boundary', async () => {
    rejectTransformationConnectionWith('invalid_edge_order');
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith(
      canvasViewCopy.transformationConnectionOrderMessage
    );
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });
});
