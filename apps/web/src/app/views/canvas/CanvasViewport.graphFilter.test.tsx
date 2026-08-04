// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
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

describe('CanvasViewport graph filtering', () => {
  let harness: ReturnType<typeof createCanvasViewportHarness>;

  beforeEach(async () => {
    harness = createCanvasViewportHarness();
    await harness.render({ nodesWithImpact: graphNodes(), edges: graphEdges() });
  });
  afterEach(() => harness.unmount());

  it('combines filters with search and clearing restores the complete graph', () => {
    act(() => {
      fireEvent.click(document.querySelector('button[aria-label="Filter graph"]')!);
    });
    const control = document.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-filter-control"]'
    )!;
    const selects = control.querySelectorAll<HTMLSelectElement>('select');
    act(() => {
      fireEvent.change(selects[0]!, { target: { value: 'status' } });
      fireEvent.change(selects[1]!, { target: { value: 'failed' } });
      fireEvent.click(control.querySelector('button[aria-label="Add filter"]')!);
    });

    expect(viewportNode('orders-failed')?.className).toBe('domain-failed');
    expect(viewportNode('orders-success')?.className).toContain('canvas-graph-filter-dimmed-node');

    const surface = harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-viewport-context-surface"]'
    )!;
    act(() => {
      fireEvent.keyDown(surface, { key: 'f', ctrlKey: true });
    });
    const input = harness.container.querySelector<HTMLInputElement>('input[type="search"]')!;
    act(() => {
      fireEvent.change(input, { target: { value: 'orders' } });
    });
    expect(
      harness.container.querySelector('[data-slot="canvas-graph-search-control"]')?.textContent
    ).toContain('1 / 1');

    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    act(() => {
      fireEvent.click(document.querySelector('button[aria-label="Filter graph"]')!);
    });
    act(() => {
      fireEvent.click(
        document.querySelector(
          '[data-slot="canvas-graph-filter-control"] button[aria-label="Clear graph filters"]'
        )!
      );
    });
    expect(viewportNode('orders-success')?.className).toBe('domain-success');
    expect(viewportNodes()).toHaveLength(3);
  });

  function viewportNodes(): CanvasViewportProps['nodesWithImpact'] {
    return getCanvasViewportXyflowState().lastReactFlowProps
      ?.nodes as CanvasViewportProps['nodesWithImpact'];
  }
  function viewportNode(
    nodeId: string
  ): CanvasViewportProps['nodesWithImpact'][number] | undefined {
    return viewportNodes().find((node) => node.id === nodeId);
  }
});

function graphNodes(): CanvasViewportProps['nodesWithImpact'] {
  return [
    {
      id: 'orders-failed',
      className: 'domain-failed',
      position: { x: 0, y: 0 },
      data: {
        name: 'Orders failed',
        pluginKind: 'dbt:model',
        pluginId: 'dbt',
        role: 'transform',
        status: 'failed',
        tags: [],
      },
    },
    {
      id: 'orders-success',
      className: 'domain-success',
      position: { x: 200, y: 0 },
      data: {
        name: 'Orders success',
        pluginKind: 'dbt:model',
        pluginId: 'dbt',
        role: 'transform',
        status: 'success',
        tags: [],
      },
    },
    {
      id: 'customers',
      className: 'domain-customers',
      position: { x: 400, y: 0 },
      data: {
        name: 'Customers',
        pluginKind: 'dbt:source',
        pluginId: 'dbt',
        role: 'input',
        status: 'success',
        tags: [],
      },
    },
  ];
}

function graphEdges(): CanvasViewportProps['edges'] {
  return [
    { id: 'failed-customers', source: 'orders-failed', target: 'customers' },
    { id: 'success-customers', source: 'orders-success', target: 'customers' },
  ];
}
