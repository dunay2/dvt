// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasDraftSession } from './canvasDraftSession';
import { useCanvasEdgeChangeHandlers } from './useCanvasEdgeChangeHandlers';

type LatestHook = ReturnType<typeof useCanvasEdgeChangeHandlers> | null;

function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
      signature: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'sink-node'],
      visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
      pendingExplicitNodeIds: [],
    },
  };
}

function renderHookHost({
  draftSession = buildDraftSession(),
  setEdges = vi.fn(),
  setDraftSession = vi.fn(),
}: {
  draftSession?: CanvasDraftSession;
  setEdges?: ReturnType<typeof vi.fn>;
  setDraftSession?: ReturnType<typeof vi.fn>;
}): {
  latest: () => LatestHook;
  render: () => Promise<void>;
  cleanup: () => void;
  spies: {
    setEdges: ReturnType<typeof vi.fn>;
    setDraftSession: ReturnType<typeof vi.fn>;
  };
} {
  let latest: LatestHook = null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    latest = useCanvasEdgeChangeHandlers({
      state: {
        graphModel: {
          nodes: [],
          edges: [{ id: 'edge-1', source: 'source-node', target: 'sink-node' }],
          setNodes: vi.fn(),
          setEdges,
        },
        draftSession,
      },
      effects: {
        setDraftSession,
      },
    });
    return null;
  }

  return {
    latest: () => latest,
    render: async () => {
      await act(async () => {
        root.render(<HookHost />);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    spies: {
      setEdges,
      setDraftSession,
    },
  };
}

describe('useCanvasEdgeChangeHandlers', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates edges and draft visibility through the graph lifecycle component', async () => {
    const harness = renderHookHost({});
    await harness.render();

    act(() => {
      harness.latest()?.handleEdgesChange([
        {
          id: 'edge-1',
          type: 'remove',
        },
      ]);
    });

    expect(harness.spies.setEdges).toHaveBeenCalledWith([]);
    expect(harness.spies.setDraftSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workingSet: expect.objectContaining({
          visibleEdges: [],
        }),
      })
    );

    harness.cleanup();
  });

  it('keeps visual-only edge selection local when visible-edge truth does not change', async () => {
    const harness = renderHookHost({});
    await harness.render();

    act(() => {
      harness.latest()?.handleEdgesChange([
        {
          id: 'edge-1',
          type: 'select',
          selected: true,
        },
      ]);
    });

    expect(harness.spies.setEdges).toHaveBeenCalledTimes(1);
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
