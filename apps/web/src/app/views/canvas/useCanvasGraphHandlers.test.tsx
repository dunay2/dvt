// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';

vi.mock('../../plugins/contracts/ConnectionRules', () => ({
  evaluateConnection: () => ({ allowed: true }),
}));

vi.mock('../../plugins/nodeTypeRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../plugins/nodeTypeRegistry')>();
  return {
    ...actual,
    resolveCanvasEdgeType: () => 'lineage',
  };
});

vi.mock('./transformationConnectionGuard', () => ({
  guardTransformationConnection: () => ({ allowed: true }),
}));

vi.mock('./transformationAuthoringGuard', () => ({
  guardTransformationAuthoringNode: () => ({ allowed: true }),
}));

const toastState = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastState,
}));

type LatestHook = ReturnType<typeof useCanvasGraphHandlers> | null;

function buildCanonicalNode(id: string, role: CanonicalNode['role']): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: role === 'input' ? 'dvt:source' : 'dvt:sink',
    role,
    status: 'idle',
    tags: [],
  };
}

function renderHookHost({
  canEditEdges,
  setNodes = vi.fn(),
  setEdges = vi.fn(),
  onVisibleEdgesChanged,
  onNodeAddedToCanvas,
}: {
  canEditEdges: boolean;
  setNodes?: ReturnType<typeof vi.fn>;
  setEdges?: ReturnType<typeof vi.fn>;
  onVisibleEdgesChanged?: (edges: Array<{ sourceId: string; targetId: string }>) => void;
  onNodeAddedToCanvas?: (nodeId: string) => void;
}): {
  latest: () => LatestHook;
  render: () => Promise<void>;
  cleanup: () => void;
  setNodes: ReturnType<typeof vi.fn>;
  setEdges: ReturnType<typeof vi.fn>;
} {
  const canonicalNodes = [
    buildCanonicalNode('source-node', 'input'),
    buildCanonicalNode('sink-node', 'output'),
  ];
  const canonicalNodesById = new Map(canonicalNodes.map((node) => [node.id, node]));
  const nodes = [
    { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
    { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
  ];
  const edges: Array<{ id: string; source: string; target: string }> = [];

  let latest: LatestHook = null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    latest = useCanvasGraphHandlers({
      graphStrategy: {
        id: 'transformation',
        mapNodeToCanonical: () => null,
        mapEdgeToCanonical: () => null,
        parseDropPayload: () => null,
      },
      canonicalNodesById,
      edges,
      nodes,
      selectedNodeIds: [],
      inspectorNodeId: null,
      canEditEdges,
      focusMode: false,
      inspectorPanelVisible: true,
      columnLevelLineageEnabled: false,
      setNodes,
      setEdges,
      setSelectedNodes: vi.fn(),
      setInspectorNode: vi.fn(),
      toggleInspectorPanel: vi.fn(),
      onLayoutComplete: vi.fn(),
      onVisibleEdgesChanged,
      onNodeAddedToCanvas,
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
    setNodes,
    setEdges,
  };
}

describe('useCanvasGraphHandlers', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    toastState.error.mockReset();
    toastState.success.mockReset();
    toastState.info.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects edge creation when graph edits are gated', async () => {
    const harness = renderHookHost({ canEditEdges: false });
    await harness.render();

    act(() => {
      harness.latest()?.onConnect({
        source: 'source-node',
        sourceHandle: null,
        target: 'sink-node',
        targetHandle: null,
      });
    });

    expect(toastState.error).toHaveBeenCalledWith('Graph edits are unavailable in this context.');
    expect(harness.latest()?.confirmEdgeModal).toEqual({ open: false, edge: null });

    harness.cleanup();
  });

  it('rejects node removal when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const harness = renderHookHost({
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

  it('rejects node drops when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const harness = renderHookHost({
      canEditEdges: false,
      setNodes,
    });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn(() => ''),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(toastState.error).toHaveBeenCalledWith('Graph edits are unavailable in this context.');
    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('uses functional edge updater when confirming a connection', async () => {
    const setEdges = vi.fn();
    const onVisibleEdgesChanged = vi.fn();
    const harness = renderHookHost({
      canEditEdges: true,
      setEdges,
      onVisibleEdgesChanged,
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
    expect(onVisibleEdgesChanged).toHaveBeenCalledWith([
      { sourceId: 'source-node', targetId: 'sink-node' },
    ]);

    harness.cleanup();
  });

  it('uses functional node updater when dropping a canonical node', async () => {
    const setNodes = vi.fn();
    const onNodeAddedToCanvas = vi.fn();
    const harness = renderHookHost({
      canEditEdges: true,
      setNodes,
      onNodeAddedToCanvas,
    });
    await harness.render();

    const payload = JSON.stringify(buildCanonicalNode('transform-node', 'transform'));
    const dragEvent = {
      preventDefault: vi.fn(),
      target: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      clientX: 120,
      clientY: 80,
      dataTransfer: {
        getData: vi.fn(() => payload),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    const nextNodes = nodeUpdater([
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(nextNodes.map((node: { id: string }) => node.id)).toContain('transform-node');
    expect(onNodeAddedToCanvas).toHaveBeenCalledWith('transform-node');

    harness.cleanup();
  });

  it('uses functional updaters when removing a node', async () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const onVisibleEdgesChanged = vi.fn();
    const harness = renderHookHost({
      canEditEdges: true,
      setNodes,
      setEdges,
      onVisibleEdgesChanged,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleRemoveNode('source-node');
    });

    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    const edgeUpdater = setEdges.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    expect(typeof edgeUpdater).toBe('function');
    const nextEdges = edgeUpdater([
      { id: 'edge-1', source: 'source-node', target: 'sink-node' },
      { id: 'edge-2', source: 'sink-node', target: 'source-node' },
    ]);
    expect(nextEdges).toEqual([]);
    expect(onVisibleEdgesChanged).toHaveBeenCalledWith([]);

    harness.cleanup();
  });
});
