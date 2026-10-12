// @vitest-environment jsdom
/** Owned concern: relational workbench menu behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { instantiateWorkbenchSource } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench menu', () => {
  setupWorkbenchTest();
  it('opens and dismisses operation discovery without discarding the draft', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
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
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    await instantiateWorkbenchSource(sourceButtons[0]!);
    await instantiateWorkbenchSource(sourceButtons[1]!);
    const pendingIds = [...container.querySelectorAll('[data-pending="true"]')].map((node) =>
      node.getAttribute('data-relation-id')
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-operation-menu-trigger"]'
    );
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle?.click());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(
      [...container.querySelectorAll('[data-pending="true"]')].map((node) =>
        node.getAttribute('data-relation-id')
      )
    ).toEqual(pendingIds);
    expect(pendingIds).toHaveLength(2);

    act(() => toggle?.click());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });
});
