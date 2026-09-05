// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
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
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeRenderer } from '../../plugins/graph/GraphNodeRenderer';
import type { CanonicalNode } from '../../types/canonical';

describe('CanvasViewport graph filtering', () => {
  let harness: ReturnType<typeof createCanvasViewportHarness>;

  beforeEach(async () => {
    useApplicationLanguageStore.setState({ language: 'en' });
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

  it('recomputes active search and filters after graph changes without mutating graph input', async () => {
    const initialNodes = graphNodes();
    const initialEdges = graphEdges();
    const initialNodesSnapshot = structuredClone(initialNodes);
    const initialEdgesSnapshot = structuredClone(initialEdges);
    const onNodesChange = vi.fn();
    await harness.render({ nodesWithImpact: initialNodes, edges: initialEdges, onNodesChange });

    openFilter();
    addFilter('status', 'failed');
    openSearch('orders');

    expect(searchControl().textContent).toContain('1 / 1');
    expect(viewportNode('orders-failed')?.className).toContain('canvas-graph-search-active-node');

    const replacementFailedNode = {
      ...graphNodes()[0]!,
      id: 'orders-retry-failed',
      data: { ...graphNodes()[0]!.data, name: 'Orders retry failed' },
    };
    const changedNodes = [graphNodes()[1]!, graphNodes()[2]!, replacementFailedNode];
    const changedEdges = [
      { id: 'retry-customers', source: replacementFailedNode.id, target: 'customers' },
    ];
    await harness.render({
      nodesWithImpact: changedNodes,
      edges: changedEdges,
      onNodesChange,
    });

    await waitFor(() => {
      expect(searchControl().textContent).toContain('1 / 1');
      expect(viewportNode(replacementFailedNode.id)?.className).toContain(
        'canvas-graph-search-active-node'
      );
    });
    expect(viewportNode('orders-failed')).toBeUndefined();

    const graphWithoutFailedNodes = changedNodes.filter(
      (node) => node.id !== replacementFailedNode.id
    );
    await harness.render({
      nodesWithImpact: graphWithoutFailedNodes,
      edges: [],
      onNodesChange,
    });

    await waitFor(() => expect(searchControl().textContent).toContain('No results'));
    expect(viewportNodes()).toHaveLength(2);
    expect(initialNodes).toEqual(initialNodesSnapshot);
    expect(initialEdges).toEqual(initialEdgesSnapshot);
    expect(
      onNodesChange.mock.calls
        .flatMap(([changes]) => changes)
        .every((change) => change.type === 'select')
    ).toBe(true);
  });

  it('routes a real card-tag button through the existing filter controller', () => {
    const sourceNode = viewportNode('customers');
    const data = sourceNode?.data as Record<string, unknown> | undefined;
    const rendererContainer = document.createElement('div');
    document.body.append(rendererContainer);
    const rendererRoot = createRoot(rendererContainer);
    const canonicalNode: CanonicalNode = {
      id: 'customers',
      name: 'Customers',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['source'],
    };

    act(() => {
      rendererRoot.render(
        <GraphNodeRenderer
          node={canonicalNode}
          selected={false}
          hovered={false}
          overlayDecoration={null}
          badges={[]}
          graphNodeCardStrategies={[]}
          data={data ?? {}}
        />
      );
    });

    const tagButton = rendererContainer.querySelector<HTMLButtonElement>(
      'button[aria-label="Filter graph by tag source"]'
    );
    expect(tagButton?.type).toBe('button');

    act(() => {
      fireEvent.keyDown(tagButton!, { key: 'Enter' });
      fireEvent.keyDown(tagButton!, { key: ' ' });
    });

    const control = document.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-filter-control"]'
    );
    expect(control).not.toBeNull();
    expect(control?.textContent).toContain('Tag: source');
    expect(control?.querySelectorAll('[aria-label="Remove Tag filter source"]')).toHaveLength(1);
    expect(viewportNode('orders-failed')?.className).toContain('canvas-graph-filter-dimmed-node');
    expect(viewportNode('customers')?.className).toBe('domain-customers');

    act(() => rendererRoot.unmount());
    rendererContainer.remove();
  });

  it('updates card-tag action copy when the application language changes', async () => {
    act(() => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    await waitFor(() => {
      const data = viewportNode('customers')?.data as Record<string, unknown> | undefined;
      const getTagFilterLabel = data?.getTagFilterLabel as ((tag: string) => string) | undefined;
      expect(getTagFilterLabel?.('source')).toBe('Filtrar el grafo por la etiqueta source');
    });
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

  function openFilter(): void {
    act(() => {
      fireEvent.click(document.querySelector('button[aria-label="Filter graph"]')!);
    });
  }

  function addFilter(dimension: string, value: string): void {
    const control = document.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-filter-control"]'
    )!;
    const selects = control.querySelectorAll<HTMLSelectElement>('select');
    act(() => {
      fireEvent.change(selects[0]!, { target: { value: dimension } });
      fireEvent.change(selects[1]!, { target: { value } });
      fireEvent.click(control.querySelector('button[aria-label="Add filter"]')!);
    });
  }

  function openSearch(query: string): void {
    const surface = harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-viewport-context-surface"]'
    )!;
    act(() => {
      fireEvent.keyDown(surface, { key: 'f', ctrlKey: true });
    });
    act(() => {
      fireEvent.change(harness.container.querySelector('input[type="search"]')!, {
        target: { value: query },
      });
    });
  }

  function searchControl(): HTMLElement {
    return harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-search-control"]'
    )!;
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
        pluginKind: 'dvt:transform',
        pluginId: 'dbt',
        role: 'transform',
        status: 'failed',
        tags: ['finance'],
      },
    },
    {
      id: 'orders-success',
      className: 'domain-success',
      position: { x: 200, y: 0 },
      data: {
        name: 'Orders success',
        pluginKind: 'dvt:transform',
        pluginId: 'dbt',
        role: 'transform',
        status: 'success',
        tags: ['finance'],
      },
    },
    {
      id: 'customers',
      className: 'domain-customers',
      position: { x: 400, y: 0 },
      data: {
        name: 'Customers',
        pluginKind: 'dvt:source',
        pluginId: 'dbt',
        role: 'input',
        status: 'success',
        tags: ['source'],
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
