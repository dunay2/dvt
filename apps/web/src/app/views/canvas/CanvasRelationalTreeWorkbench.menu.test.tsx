// @vitest-environment jsdom
/** Owned concern: relational workbench menu behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
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
  it('opens and dismisses operation discovery without discarding the draft', () => {
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
    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-operation-menu-trigger"]'
    );
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle?.click());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(sourceButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(sourceButtons[1]?.getAttribute('aria-pressed')).toBe('true');

    act(() => toggle?.click());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });
});
