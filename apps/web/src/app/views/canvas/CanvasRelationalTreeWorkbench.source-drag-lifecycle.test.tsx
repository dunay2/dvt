// @vitest-environment jsdom
/** Dragging never replaces the mounted applied tree before a valid drop. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import { projectionTarget } from './CanvasRelationalTreeWorkbench.operation-drag.test-support';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree source drag lifecycle', () => {
  setupWorkbenchTest();

  it('stages a second input only after a valid drop', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = projectionTarget(customers);
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, transform]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      )
    );

    const appliedTree = container.querySelector('[data-slot="canvas-relational-tree"]');
    const ordersButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('orders'))!;
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      getData: (type: string) => values.get(type) ?? '',
      setData: (type: string, value: string) => values.set(type, value),
    };
    const start = new Event('dragstart', { bubbles: true });
    Object.defineProperty(start, 'dataTransfer', { value: dataTransfer });
    await act(async () => ordersButton.dispatchEvent(start));
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);

    const drop = new MouseEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 200,
    });
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    values.set('application/x-dvt-relational-source', 'not-connected');
    await act(async () =>
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop)
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);

    values.set('application/x-dvt-relational-source', orders.id);
    await act(async () =>
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop)
    );
    openOperationMenu(container);
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.getAttribute('aria-disabled')
    ).toBe('false');
  });
});
