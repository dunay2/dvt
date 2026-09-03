// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection schema replacement', () => {
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

  it('adopts canonical order when scalar siblings are replaced by a struct parent', async () => {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          expanded
          columns={[
            { id: 'output:order_id', name: 'order_id', type: 'integer' },
            { id: 'output:customer', name: 'customer', type: 'text' },
            { id: 'output:amount', name: 'amount', type: 'numeric' },
          ]}
        />
      );
    });
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          expanded
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
            { id: 'output:amount', name: 'amount', type: 'numeric' },
          ]}
        />
      );
    });

    expect(
      [...container.querySelectorAll('[data-slot="graph-node-column-piece"]')].map(
        (row) => row.firstElementChild?.textContent
      )
    ).toEqual(['identity', 'amount']);
  });
});
