// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';

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
}: {
  canEditEdges: boolean;
  setNodes?: ReturnType<typeof vi.fn>;
  setEdges?: ReturnType<typeof vi.fn>;
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
  const edges = [{ id: 'edge-1', source: 'source-node', target: 'sink-node' }];

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
});
