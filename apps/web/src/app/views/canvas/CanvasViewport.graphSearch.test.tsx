// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

describe('CanvasViewport graph search', () => {
  let harness: ReturnType<typeof createCanvasViewportHarness>;
  let onNodesChange: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    harness = createCanvasViewportHarness();
    onNodesChange = vi.fn();
    await harness.render({
      nodesWithImpact: searchNodes(),
      edges: searchEdges(),
      onNodesChange,
    });
  });
  afterEach(() => harness.unmount());

  it('supports the complete keyboard-only open, navigate, and close flow', async () => {
    const surface = harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-viewport-context-surface"]'
    )!;
    surface.focus();

    act(() => {
      fireEvent.keyDown(surface, { key: 'f', ctrlKey: true });
    });
    const input = await waitFor(() => {
      const candidate = harness.container.querySelector<HTMLInputElement>('input[type="search"]');
      expect(candidate).not.toBeNull();
      expect(document.activeElement).toBe(candidate);
      return candidate!;
    });

    const searchActions = Array.from(searchControl().querySelectorAll<HTMLButtonElement>('button'));
    const closeButton = searchActions.at(-1)!;
    act(() => {
      closeButton.focus();
      fireEvent.keyDown(closeButton, { key: 'f', ctrlKey: true });
    });
    expect(document.activeElement).toBe(input);

    act(() => {
      fireEvent.change(input, { target: { value: 'orders' } });
    });
    expect(searchControl().textContent).toContain('1 / 2');
    await waitFor(() =>
      expect(getCanvasViewportXyflowState().fitView).toHaveBeenLastCalledWith(
        expect.objectContaining({ nodes: [expect.objectContaining({ id: 'orders-a' })] })
      )
    );
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: 'orders-a', type: 'select', selected: true },
    ]);
    expect(activeSearchNode()?.id).toBe('orders-a');
    expect(searchNode('orders-b')?.className).toContain('canvas-graph-search-matching-node');
    expect(searchNode('customers')?.className).toContain('canvas-graph-search-dimmed-node');
    expect(searchEdge('orders-a-customers')?.className).toContain(
      'canvas-graph-search-relevant-edge'
    );
    expect(searchEdge('orders-b-customers')?.className).toContain(
      'canvas-graph-search-dimmed-edge'
    );
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(searchControl().textContent).toContain('2 / 2');
    await waitFor(() =>
      expect(getCanvasViewportXyflowState().fitView).toHaveBeenLastCalledWith(
        expect.objectContaining({ nodes: [expect.objectContaining({ id: 'orders-b' })] })
      )
    );
    expect(onNodesChange).toHaveBeenLastCalledWith([
      { id: 'orders-b', type: 'select', selected: true },
    ]);
    expect(activeSearchNode()?.id).toBe('orders-b');
    expect(searchNode('orders-a')?.className).toContain('canvas-graph-search-matching-node');
    expect(searchEdge('orders-a-customers')?.className).toContain(
      'canvas-graph-search-dimmed-edge'
    );
    expect(searchEdge('orders-b-customers')?.className).toContain(
      'canvas-graph-search-relevant-edge'
    );
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    expect(harness.container.querySelector('[data-slot="canvas-graph-search-control"]')).toBeNull();
    expect(document.activeElement).toBe(surface);
    expect(searchNode('orders-a')?.className).toBe('domain-orders-a');
    expect(searchNode('orders-b')?.className).toBe('domain-orders-b');
    expect(searchNode('customers')?.className).toBe('domain-customers');
    expect(searchEdge('orders-a-customers')?.className).toBe('domain-edge-a');
    expect(searchEdge('orders-b-customers')?.className).toBe('domain-edge-b');

    act(() => {
      fireEvent.keyDown(surface, { key: 'f', metaKey: true });
    });
    const reopenedInput = harness.container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(reopenedInput?.value).toBe('');
  });

  it('keeps search reveals ephemeral while persisting operator viewport moves', async () => {
    const onViewportChange = vi.fn();
    await harness.render({ nodesWithImpact: searchNodes(), onViewportChange });
    const surface = harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-viewport-context-surface"]'
    )!;

    act(() => {
      fireEvent.keyDown(surface, { key: 'f', ctrlKey: true });
    });
    const input = await waitFor(() => {
      const candidate = harness.container.querySelector<HTMLInputElement>('input[type="search"]');
      expect(candidate).not.toBeNull();
      return candidate!;
    });
    act(() => {
      fireEvent.change(input, { target: { value: 'orders' } });
    });
    await waitFor(() => expect(getCanvasViewportXyflowState().fitView).toHaveBeenCalled());

    const onMoveEnd = getCanvasViewportXyflowState().lastReactFlowProps?.onMoveEnd as (
      event: MouseEvent | null,
      viewport: { x: number; y: number; zoom: number }
    ) => void;
    act(() => {
      onMoveEnd(null, { x: -400, y: -200, zoom: 0.9 });
    });
    expect(onViewportChange).not.toHaveBeenCalled();

    act(() => {
      onMoveEnd(new MouseEvent('mouseup'), { x: -120, y: -80, zoom: 0.75 });
    });
    expect(onViewportChange).toHaveBeenCalledWith({ x: -120, y: -80, zoom: 0.75 });
  });

  function searchControl(): HTMLElement {
    return harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-search-control"]'
    )!;
  }

  function activeSearchNode(): CanvasViewportProps['nodesWithImpact'][number] | undefined {
    return searchNodesFromViewport()?.find((node) =>
      node.className?.split(' ').includes('canvas-graph-search-active-node')
    );
  }

  function searchNode(nodeId: string): CanvasViewportProps['nodesWithImpact'][number] | undefined {
    return searchNodesFromViewport()?.find((node) => node.id === nodeId);
  }

  function searchNodesFromViewport(): CanvasViewportProps['nodesWithImpact'] | undefined {
    return getCanvasViewportXyflowState().lastReactFlowProps?.nodes as
      CanvasViewportProps['nodesWithImpact'] | undefined;
  }

  function searchEdge(edgeId: string): CanvasViewportProps['edges'][number] | undefined {
    const reactFlowEdges = getCanvasViewportXyflowState().lastReactFlowProps?.edges as
      CanvasViewportProps['edges'] | undefined;
    return reactFlowEdges?.find((edge) => edge.id === edgeId);
  }

  function searchNodes(): CanvasViewportProps['nodesWithImpact'] {
    return [
      {
        id: 'orders-a',
        className: 'domain-orders-a',
        position: { x: 0, y: 0 },
        data: {
          name: 'Orders A',
          pluginKind: 'dvt:transform',
          pluginId: 'dbt',
          role: 'transform',
          tags: [],
        },
      },
      {
        id: 'orders-b',
        className: 'domain-orders-b',
        position: { x: 200, y: 0 },
        data: {
          name: 'Orders B',
          pluginKind: 'dvt:transform',
          pluginId: 'dbt',
          role: 'transform',
          tags: [],
        },
      },
      {
        id: 'customers',
        className: 'domain-customers',
        position: { x: 400, y: 0 },
        data: {
          name: 'Customers',
          pluginKind: 'dvt:transform',
          pluginId: 'dbt',
          role: 'transform',
          tags: [],
        },
      },
    ];
  }

  function searchEdges(): CanvasViewportProps['edges'] {
    return [
      {
        id: 'orders-a-customers',
        source: 'orders-a',
        target: 'customers',
        className: 'domain-edge-a',
      },
      {
        id: 'orders-b-customers',
        source: 'orders-b',
        target: 'customers',
        className: 'domain-edge-b',
      },
    ];
  }
});
