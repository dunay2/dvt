// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import type { Node } from '@xyflow/react';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasGraphSearchController } from './useCanvasGraphSearchController';

function graphNode(id: string, name: string): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      name,
      description: `${name} description`,
      path: `models/${id}.sql`,
      pluginKind: 'dvt:transform',
      pluginId: 'dbt',
      role: 'transform',
      tags: ['finance'],
    },
  };
}

describe('useCanvasGraphSearchController', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens from the Canvas shortcut, wraps navigation, and clears state on close', () => {
    function Harness(): JSX.Element {
      const controller = useCanvasGraphSearchController({
        nodes: [graphNode('orders-a', 'Orders A'), graphNode('orders-b', 'Orders B')],
      });

      return (
        <div data-testid="host" onKeyDown={controller.onViewportKeyDown}>
          <section onKeyDown={controller.onControlKeyDown}>
            <input
              aria-label="query"
              value={controller.model.query}
              onChange={(event) => controller.setQuery(event.currentTarget.value)}
              onKeyDown={controller.onQueryKeyDown}
            />
            <button type="button" onClick={controller.showPrevious}>
              Previous
            </button>
            <button type="button" onClick={controller.close}>
              Close
            </button>
          </section>
          <output data-testid="state">
            {JSON.stringify({
              open: controller.model.open,
              status: controller.model.status,
              active: controller.model.activeNodeId,
              matches: controller.matchingNodeIds,
              position: controller.model.activeMatchPosition,
              count: controller.model.matchCount,
            })}
          </output>
        </div>
      );
    }

    act(() => root.render(<Harness />));
    const host = container.querySelector<HTMLElement>('[data-testid="host"]')!;
    const input = container.querySelector<HTMLInputElement>('input')!;

    act(() => {
      fireEvent.keyDown(host, { key: 'f', ctrlKey: true });
    });
    expect(state()).toMatchObject({ open: true, status: 'idle' });

    act(() => {
      fireEvent.change(input, { target: { value: 'orders' } });
    });
    expect(state()).toMatchObject({
      open: true,
      status: 'matched',
      active: 'orders-a',
      matches: ['orders-a', 'orders-b'],
      position: 1,
      count: 2,
    });

    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(state()).toMatchObject({ active: 'orders-b', position: 2, count: 2 });
    const previousButton = container.querySelector<HTMLButtonElement>('button')!;
    previousButton.focus();
    act(() => {
      fireEvent.keyDown(previousButton, { key: 'Enter' });
    });
    expect(state()).toMatchObject({ active: 'orders-b', position: 2, count: 2 });
    act(() => {
      previousButton.click();
    });
    expect(state()).toMatchObject({ active: 'orders-a', position: 1, count: 2 });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(state()).toMatchObject({ active: 'orders-b', position: 2, count: 2 });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    });
    expect(state()).toMatchObject({ active: 'orders-a', position: 1, count: 2 });

    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    expect(state()).toMatchObject({
      open: false,
      status: 'idle',
      active: null,
      matches: [],
      position: null,
      count: 0,
    });
    expect(input.value).toBe('');

    function state(): Record<string, unknown> {
      return JSON.parse(container.querySelector('[data-testid="state"]')?.textContent ?? '{}');
    }
  });

  it('does not inspect search fields for geometry-only changes while the query is empty', () => {
    const readName = vi.fn(() => 'Orders');
    const node: Node = {
      id: 'orders',
      position: { x: 0, y: 0 },
      data: {
        get name() {
          return readName();
        },
        description: 'Orders description',
        path: 'models/orders.sql',
        pluginKind: 'dbt:model',
        pluginId: 'dbt',
        role: 'transform',
        tags: ['finance'],
      },
    };

    function Harness(): JSX.Element {
      const [nodes, setNodes] = useState<Node[]>([node]);
      const controller = useCanvasGraphSearchController({ nodes });
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              setNodes((current) =>
                current.map((currentNode) => ({
                  ...currentNode,
                  position: { x: currentNode.position.x + 20, y: currentNode.position.y + 10 },
                }))
              )
            }
          >
            Move
          </button>
          <button type="button" onClick={() => controller.setQuery('orders')}>
            Search
          </button>
          <output data-testid="lazy-state">
            {JSON.stringify({
              status: controller.model.status,
              matches: controller.matchingNodeIds,
              x: nodes[0]?.position.x,
            })}
          </output>
        </div>
      );
    }

    act(() => root.render(<Harness />));
    expect(readName).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find(
          (button) => button.textContent === 'Move'
        )!
      );
    });
    expect(readName).not.toHaveBeenCalled();
    expect(JSON.parse(container.querySelector('[data-testid="lazy-state"]')?.textContent ?? '{}')).toMatchObject({
      status: 'idle',
      matches: [],
      x: 20,
    });

    act(() => {
      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find(
          (button) => button.textContent === 'Search'
        )!
      );
    });
    expect(readName).toHaveBeenCalled();
    expect(JSON.parse(container.querySelector('[data-testid="lazy-state"]')?.textContent ?? '{}')).toMatchObject({
      status: 'matched',
      matches: ['orders'],
      x: 20,
    });
  });
});
