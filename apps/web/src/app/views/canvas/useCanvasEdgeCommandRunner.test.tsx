// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge } from '@xyflow/react';

import type { CanvasDraftSession } from './canvasDraftSession';
import {
  useCanvasEdgeCommandRunner,
  type CanvasEdgeCommandRunner,
} from './useCanvasEdgeCommandRunner';

function buildSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: ['source', 'target'],
      visibleEdges: [{ sourceId: 'source', targetId: 'target' }],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
  };
}

describe('useCanvasEdgeCommandRunner execution gate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let runner: CanvasEdgeCommandRunner | null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    runner = null;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('serializes close and reopen commands over the latest draft session', () => {
    let currentSession = buildSession();
    const setDraftSession = vi.fn<Dispatch<SetStateAction<CanvasDraftSession>>>((action) => {
      currentSession = typeof action === 'function' ? action(currentSession) : action;
    });

    function Harness(): null {
      runner = useCanvasEdgeCommandRunner({
        state: {
          canonicalNodesById: new Map(),
          draftSession: currentSession,
          edges: [] as Edge[],
        },
        effects: { setEdges: vi.fn(), setDraftSession },
        pluginPortMap: new Map(),
      });
      return null;
    }

    act(() => root.render(<Harness />));
    expect(
      runner?.setExecutionGate({ sourceId: 'source', targetId: 'target', gate: 'closed' })
    ).toBe(true);
    expect(currentSession.workingSet.visibleEdges[0]?.executionGate).toBe('closed');

    expect(runner?.setExecutionGate({ sourceId: 'source', targetId: 'target', gate: 'open' })).toBe(
      true
    );
    expect(currentSession.workingSet.visibleEdges[0]?.executionGate).toBeUndefined();
  });

  it('rejects a missing edge without dispatching a mutation', () => {
    const currentSession = buildSession();
    const setDraftSession = vi.fn<Dispatch<SetStateAction<CanvasDraftSession>>>();

    function Harness(): null {
      runner = useCanvasEdgeCommandRunner({
        state: { canonicalNodesById: new Map(), draftSession: currentSession, edges: [] },
        effects: { setEdges: vi.fn(), setDraftSession },
        pluginPortMap: new Map(),
      });
      return null;
    }

    act(() => root.render(<Harness />));
    expect(
      runner?.setExecutionGate({ sourceId: 'missing', targetId: 'target', gate: 'closed' })
    ).toBe(false);
    expect(setDraftSession).not.toHaveBeenCalled();
  });
});
