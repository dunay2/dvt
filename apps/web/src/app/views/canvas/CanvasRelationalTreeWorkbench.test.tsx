// @vitest-environment jsdom
/** Owned concern: relational workbench inspection shell behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { CanvasRelationalTreeEditorFrame } from './CanvasRelationalTreeEditorFrame';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench ', () => {
  setupWorkbenchTest();
  it('keeps the same properties controls mounted while activating inspection tabs by keyboard', () => {
    act(() =>
      root.render(
        <CanvasRelationalTreeEditorFrame operation="inner_join" onClose={() => undefined}>
          <input aria-label="Pending property" defaultValue="draft" />
        </CanvasRelationalTreeEditorFrame>
      )
    );
    const input = container.querySelector('input')!;
    input.value = 'pending edit';
    const activate = (slot: string): void => {
      act(() => {
        container
          .querySelector(`[data-slot="${slot}"]`)!
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
    };
    activate('canvas-operation-tree-tab');
    expect(input.closest('[role="tabpanel"]')?.getAttribute('data-state')).toBe('inactive');
    activate('canvas-operation-properties-tab');
    expect(input.closest('[role="tabpanel"]')?.getAttribute('data-state')).toBe('active');
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('pending edit');
  });

  it('shows pending Sources without fabricating a tree', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
          copy={COPY}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      2
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-unavailable"]')?.textContent
    ).toContain('No canonical relational tree is available.');
    expect(container.textContent).toContain('Pending');
  });
});
