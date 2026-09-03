// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnChildren reorder', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('moves a nested field with the accessible keyboard path', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:identity',
              name: 'identity',
              type: 'struct',
              children: [
                { id: 'output:order_id', name: 'order_id', type: 'integer' },
                { id: 'output:customer', name: 'customer', type: 'text' },
              ],
            },
          ]}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="graph-node-column-toggle"]')!);
    });
    const nested = container.querySelectorAll<HTMLElement>(
      '[data-slot="graph-node-nested-column"]'
    );

    await act(async () => {
      nested[1]!.focus();
      fireEvent.keyDown(nested[1]!, { key: 'ArrowUp', altKey: true });
    });

    expect(onColumnReorder).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      parentColumnId: 'output:identity',
      columnId: 'output:customer',
      targetColumnId: 'output:order_id',
      placement: 'before',
    });
  });
});
