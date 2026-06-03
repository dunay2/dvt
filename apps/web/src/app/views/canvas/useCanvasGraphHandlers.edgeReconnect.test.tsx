// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers edge reconnect', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('reconnects an existing edge through the canonical draft aggregate without replacing its identity', async () => {
    const setEdges = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [
        buildCanonicalNode('source-node', 'input'),
        buildCanonicalNode('transform-node', 'transform'),
        buildCanonicalNode('sink-node', 'output'),
      ],
      nodes: [
        {
          id: 'source-node',
          data: { name: 'source-node', pluginKind: 'dvt:source', role: 'input', status: 'idle' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'transform-node',
          data: {
            name: 'transform-node',
            pluginKind: 'dvt:transform',
            role: 'transform',
            status: 'idle',
          },
          position: { x: 220, y: 0 },
        },
        {
          id: 'sink-node',
          data: { name: 'sink-node', pluginKind: 'dvt:sink', role: 'output', status: 'idle' },
          position: { x: 440, y: 0 },
        },
      ],
      edges: [{ id: 'edge-1', source: 'source-node', target: 'sink-node' }],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['source-node', 'transform-node', 'sink-node'],
          visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
          pendingExplicitNodeIds: [],
        },
      },
      setEdges,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      (
        harness.latest() as unknown as {
          onReconnect?: (
            oldEdge: { id: string; source: string; target: string },
            newConnection: { source: string; target: string; sourceHandle: null; targetHandle: null }
          ) => void;
        }
      ).onReconnect?.(
        { id: 'edge-1', source: 'source-node', target: 'sink-node' },
        {
          source: 'source-node',
          sourceHandle: null,
          target: 'transform-node',
          targetHandle: null,
        }
      );
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    const nextEdges = setEdges.mock.calls[0]?.[0];
    expect(typeof nextEdges).not.toBe('function');
    expect(nextEdges).toEqual([
      {
        id: 'edge-1',
        source: 'source-node',
        sourceHandle: null,
        target: 'transform-node',
        targetHandle: null,
      },
    ]);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof nextDraftSession).not.toBe('function');
    expect(nextDraftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'transform-node' },
    ]);

    harness.cleanup();
  });

  it('rejects reconnect when graph edits are gated', async () => {
    const setEdges = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setEdges,
    });
    await harness.render();

    act(() => {
      (
        harness.latest() as unknown as {
          onReconnect?: (
            oldEdge: { id: string; source: string; target: string },
            newConnection: { source: string; target: string; sourceHandle: null; targetHandle: null }
          ) => void;
        }
      ).onReconnect?.(
        { id: 'edge-1', source: 'source-node', target: 'sink-node' },
        {
          source: 'source-node',
          sourceHandle: null,
          target: 'transform-node',
          targetHandle: null,
        }
      );
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setEdges).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
