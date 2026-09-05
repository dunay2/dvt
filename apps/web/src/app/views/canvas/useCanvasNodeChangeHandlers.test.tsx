// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Edge, Node } from '@xyflow/react';

import type { CanvasDraftSession } from './canvasDraftSession';
import { useCanvasNodeChangeHandlers } from './useCanvasNodeChangeHandlers';

type LatestHook = ReturnType<typeof useCanvasNodeChangeHandlers> | null;

function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'sink-node'],
      visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
      pendingExplicitNodeIds: [],
    },
  };
}

function buildNodes(): Node[] {
  return [
    { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
    { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
  ];
}

function buildEdges(): Edge[] {
  return [{ id: 'edge-1', source: 'source-node', target: 'sink-node' }];
}

type NodeChangeHarness = {
  latest: () => LatestHook;
  render: () => Promise<void>;
  cleanup: () => void;
  spies: {
    setNodes: ReturnType<typeof vi.fn>;
    setEdges: ReturnType<typeof vi.fn>;
    setDraftSession: ReturnType<typeof vi.fn>;
    setSelectedNodes: ReturnType<typeof vi.fn>;
    setInspectorNode: ReturnType<typeof vi.fn>;
    onLayoutComplete: ReturnType<typeof vi.fn>;
  };
};

function renderHookHost({
  draftSession = buildDraftSession(),
  nodes = buildNodes(),
  edges = buildEdges(),
  selectedNodeIds = ['source-node', 'sink-node'],
  inspectorNodeId = 'source-node',
  setNodes = vi.fn(),
  setEdges = vi.fn(),
  setDraftSession = vi.fn(),
  setSelectedNodes = vi.fn(),
  reconcileSelectionAfterNodeRemoval = setSelectedNodes,
  setInspectorNode = vi.fn(),
  onLayoutComplete = vi.fn(),
}: {
  draftSession?: CanvasDraftSession;
  nodes?: Node[];
  edges?: Edge[];
  selectedNodeIds?: string[];
  inspectorNodeId?: string | null;
  setNodes?: ReturnType<typeof vi.fn>;
  setEdges?: ReturnType<typeof vi.fn>;
  setDraftSession?: ReturnType<typeof vi.fn>;
  setSelectedNodes?: ReturnType<typeof vi.fn>;
  reconcileSelectionAfterNodeRemoval?: ReturnType<typeof vi.fn>;
  setInspectorNode?: ReturnType<typeof vi.fn>;
  onLayoutComplete?: ReturnType<typeof vi.fn>;
}): NodeChangeHarness {
  let latest: LatestHook = null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    latest = useCanvasNodeChangeHandlers({
      state: {
        graphModel: {
          nodes,
          edges,
          setNodes,
          setEdges,
        },
        draftSession,
        uiScope: {
          selectedNodeIds,
          inspectorNodeId,
        },
        selectedNodeIds,
      },
      effects: {
        setDraftSession,
        reconcileSelectionAfterNodeRemoval,
        setInspectorNode,
        onLayoutComplete,
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
      setNodes,
      setEdges,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
      onLayoutComplete,
    },
  };
}

describe('useCanvasNodeChangeHandlers', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes nodes through the centralized command and updates all coupled state once', async () => {
    const harness = renderHookHost({});
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'remove',
        },
      ]);
    });

    expect(harness.spies.setNodes).toHaveBeenCalledWith([
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(harness.spies.setEdges).toHaveBeenCalledWith([]);
    expect(harness.spies.setSelectedNodes).toHaveBeenCalledWith(['sink-node']);
    expect(harness.spies.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.spies.setDraftSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workingSet: expect.objectContaining({
          visibleNodeIds: ['sink-node'],
          visibleEdges: [],
        }),
      })
    );

    harness.cleanup();
  });

  it('keeps the operation local when no node is removed', async () => {
    const harness = renderHookHost({});
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'position',
          position: { x: 42, y: 24 },
        },
      ]);
    });

    expect(harness.spies.setNodes).toHaveBeenCalledTimes(1);
    expect(harness.spies.setEdges).not.toHaveBeenCalled();
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();
    expect(harness.spies.setSelectedNodes).not.toHaveBeenCalled();
    expect(harness.spies.setInspectorNode).not.toHaveBeenCalled();
    expect(harness.spies.onLayoutComplete).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('applies drag-only node changes against the latest node state', async () => {
    let currentNodes: Node[] = [
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 42, y: 24 } },
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ];
    const setNodes = vi.fn((nextNodes: Node[] | ((existingNodes: Node[]) => Node[])) => {
      currentNodes = typeof nextNodes === 'function' ? nextNodes(currentNodes) : nextNodes;
    });
    const harness = renderHookHost({
      nodes: buildNodes(),
      setNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'position',
          dragging: true,
        },
      ]);
    });

    expect(setNodes).toHaveBeenCalledWith(expect.any(Function));
    expect(currentNodes[0]).toMatchObject({
      id: 'source-node',
      dragging: true,
      position: { x: 42, y: 24 },
    });
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();
    expect(harness.spies.setSelectedNodes).not.toHaveBeenCalled();
    expect(harness.spies.setInspectorNode).not.toHaveBeenCalled();
    expect(harness.spies.onLayoutComplete).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('keeps settled position changes local to the viewport model', async () => {
    let currentNodes: Node[] = buildNodes();
    const setNodes = vi.fn((nextNodes: Node[] | ((existingNodes: Node[]) => Node[])) => {
      currentNodes = typeof nextNodes === 'function' ? nextNodes(currentNodes) : nextNodes;
    });
    const harness = renderHookHost({
      setNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'position',
          dragging: false,
          position: { x: 225, y: 210 },
        },
      ]);
    });

    expect(currentNodes[0]?.position).toEqual({ x: 225, y: 210 });
    expect(harness.spies.onLayoutComplete).not.toHaveBeenCalled();
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('keeps active drag coordinates local when the change carries a position payload', async () => {
    let currentNodes: Node[] = buildNodes();
    const setNodes = vi.fn((nextNodes: Node[] | ((existingNodes: Node[]) => Node[])) => {
      currentNodes = typeof nextNodes === 'function' ? nextNodes(currentNodes) : nextNodes;
    });
    const harness = renderHookHost({
      setNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'position',
          dragging: true,
          position: { x: 96, y: 72 },
        },
      ]);
    });

    expect(currentNodes[0]?.position).toEqual({ x: 96, y: 72 });
    expect(harness.spies.onLayoutComplete).not.toHaveBeenCalled();
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('keeps a settled drag marker local when React Flow omits the final position payload', async () => {
    const harness = renderHookHost({
      nodes: [
        { id: 'source-node', data: { name: 'source-node' }, position: { x: 225, y: 210 } },
        { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
      ],
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleNodesChange([
        {
          id: 'source-node',
          type: 'position',
          dragging: false,
        },
      ]);
    });

    expect(harness.spies.setNodes).toHaveBeenCalledWith(expect.any(Function));
    expect(harness.spies.onLayoutComplete).not.toHaveBeenCalled();
    expect(harness.spies.setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
