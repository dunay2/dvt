import type { Node, NodeChange } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import { focusCanvasViewportNode } from './canvasViewportNodeFocus';

describe('focusCanvasViewportNode', () => {
  it('selects and centers exactly the requested rendered node', () => {
    const nodes: Node[] = [
      { id: 'orders', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'customers', position: { x: 3200, y: 1800 }, data: {} },
    ];
    const onNodesChange = vi.fn<(changes: NodeChange[]) => void>();
    const fitView = vi.fn().mockResolvedValue(undefined);

    expect(
      focusCanvasViewportNode({
        nodeId: 'customers',
        nodes,
        selectNode: true,
        port: { onNodesChange, fitView },
      })
    ).toBe(true);

    expect(onNodesChange).toHaveBeenCalledWith([
      { id: 'orders', type: 'select', selected: false },
      { id: 'customers', type: 'select', selected: true },
    ]);
    expect(fitView).toHaveBeenCalledWith({
      nodes: [nodes[1]],
      padding: 0.5,
      maxZoom: 0.9,
      duration: 180,
    });
  });

  it('centers without changing selection when selection is not allowed', () => {
    const node: Node = { id: 'orders', position: { x: 0, y: 0 }, data: {} };
    const onNodesChange = vi.fn();
    const fitView = vi.fn().mockResolvedValue(undefined);

    expect(
      focusCanvasViewportNode({
        nodeId: node.id,
        nodes: [node],
        selectNode: false,
        port: { onNodesChange, fitView },
      })
    ).toBe(true);

    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).toHaveBeenCalledWith(expect.objectContaining({ nodes: [node] }));
  });

  it('rejects a stale node id without viewport or selection effects', () => {
    const onNodesChange = vi.fn();
    const fitView = vi.fn().mockResolvedValue(undefined);

    expect(
      focusCanvasViewportNode({
        nodeId: 'removed-node',
        nodes: [{ id: 'orders', position: { x: 0, y: 0 }, data: {} }],
        selectNode: true,
        port: { onNodesChange, fitView },
      })
    ).toBe(false);

    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();
  });
});
