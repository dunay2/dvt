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
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

describe('CanvasViewport graph search', () => {
  let harness: ReturnType<typeof createCanvasViewportHarness>;

  beforeEach(async () => {
    harness = createCanvasViewportHarness();
    await harness.render({ nodesWithImpact: searchNodes() });
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

    act(() => {
      fireEvent.change(input, { target: { value: 'orders' } });
    });
    expect(searchControl().textContent).toContain('1 / 2');
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(searchControl().textContent).toContain('2 / 2');
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    expect(harness.container.querySelector('[data-slot="canvas-graph-search-control"]')).toBeNull();
    expect(document.activeElement).toBe(surface);

    act(() => {
      fireEvent.keyDown(surface, { key: 'f', metaKey: true });
    });
    const reopenedInput = harness.container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(reopenedInput?.value).toBe('');
  });

  function searchControl(): HTMLElement {
    return harness.container.querySelector<HTMLElement>(
      '[data-slot="canvas-graph-search-control"]'
    )!;
  }

  function searchNodes(): CanvasViewportProps['nodesWithImpact'] {
    return [
      {
        id: 'orders-a',
        position: { x: 0, y: 0 },
        data: {
          name: 'Orders A',
          pluginKind: 'dbt:model',
          pluginId: 'dbt',
          role: 'transform',
          tags: [],
        },
      },
      {
        id: 'orders-b',
        position: { x: 200, y: 0 },
        data: {
          name: 'Orders B',
          pluginKind: 'dbt:model',
          pluginId: 'dbt',
          role: 'transform',
          tags: [],
        },
      },
    ];
  }
});
