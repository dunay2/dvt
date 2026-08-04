// @vitest-environment jsdom

import type { Node, NodeChange } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCanvasGraphSearchActivation,
  type CanvasGraphSearchActivationPort,
  type UseCanvasGraphSearchActivationArgs,
} from './useCanvasGraphSearchActivation';

const SOURCE_NODE: Node = {
  id: 'source',
  selected: true,
  position: { x: 0, y: 0 },
  data: { name: 'Source' },
};
const ORDERS_NODE: Node = {
  id: 'orders',
  position: { x: 200, y: 0 },
  data: { name: 'Orders' },
};
const CUSTOMERS_NODE: Node = {
  id: 'customers',
  position: { x: 400, y: 0 },
  data: { name: 'Customers' },
};

function ActivationHarness(props: UseCanvasGraphSearchActivationArgs): null {
  useCanvasGraphSearchActivation(props);
  return null;
}

describe('useCanvasGraphSearchActivation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fitView: CanvasGraphSearchActivationPort['fitView'];
  let onNodesChange: (changes: NodeChange[]) => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fitView = vi.fn().mockResolvedValue(undefined);
    onNodesChange = vi.fn();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('selects one valid active result through normal node changes and focuses it', async () => {
    const nodes = [SOURCE_NODE, ORDERS_NODE, CUSTOMERS_NODE];
    const originalNodes = structuredClone(nodes);

    await render({ activeNodeId: 'orders', nodes });

    expect(onNodesChange).toHaveBeenCalledWith([
      { id: 'source', type: 'select', selected: false },
      { id: 'orders', type: 'select', selected: true },
    ]);
    expect(fitView).toHaveBeenCalledWith({
      nodes: [ORDERS_NODE],
      padding: 0.5,
      maxZoom: 0.9,
      duration: 180,
    });
    expect(nodes).toEqual(originalNodes);
  });

  it('activates each result once while navigation changes the active identity', async () => {
    await render({ activeNodeId: 'orders' });
    vi.mocked(fitView).mockClear();
    vi.mocked(onNodesChange).mockClear();

    await render({
      activeNodeId: 'customers',
      nodes: [
        { ...SOURCE_NODE, selected: false },
        { ...ORDERS_NODE, selected: true },
        CUSTOMERS_NODE,
      ],
    });

    expect(onNodesChange).toHaveBeenCalledWith([
      { id: 'orders', type: 'select', selected: false },
      { id: 'customers', type: 'select', selected: true },
    ]);
    expect(fitView).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: [CUSTOMERS_NODE], duration: 180 })
    );

    vi.mocked(fitView).mockClear();
    vi.mocked(onNodesChange).mockClear();
    await render({ activeNodeId: 'customers', nodes: [SOURCE_NODE, ORDERS_NODE, CUSTOMERS_NODE] });

    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();
  });

  it('fails safely for stale identities and retains viewport and selection on close', async () => {
    await render({ activeNodeId: 'missing' });
    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();

    await render({ activeNodeId: 'orders' });
    vi.mocked(fitView).mockClear();
    vi.mocked(onNodesChange).mockClear();

    await render({ activeNodeId: null });

    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();
  });

  it('honors selection posture while retaining read-only viewport focus', async () => {
    await render({ activeNodeId: 'orders', canSelectNodes: false });

    expect(onNodesChange).not.toHaveBeenCalled();
    expect(fitView).toHaveBeenCalledWith(expect.objectContaining({ nodes: [ORDERS_NODE] }));

    vi.mocked(fitView).mockClear();
    await render({ activeNodeId: 'orders', canSelectNodes: true });

    expect(onNodesChange).toHaveBeenCalledWith([
      { id: 'source', type: 'select', selected: false },
      { id: 'orders', type: 'select', selected: true },
    ]);
    expect(fitView).not.toHaveBeenCalled();
  });

  async function render(
    overrides: Partial<{
      activeNodeId: string | null;
      nodes: Node[];
      canSelectNodes: boolean;
    }> = {}
  ): Promise<void> {
    const props = {
      activeNodeId: null,
      nodes: [SOURCE_NODE, ORDERS_NODE, CUSTOMERS_NODE],
      canSelectNodes: true,
      ...overrides,
    };

    await act(async () => {
      root.render(<ActivationHarness {...props} port={{ fitView, onNodesChange }} />);
    });
  }
});
