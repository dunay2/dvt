// @vitest-environment jsdom
/** Owned concern: relational workbench apply behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

describe('Canvas relational-tree Workbench apply', () => {
  setupWorkbenchTest();
  it('authors in the central canvas with an on-demand operation menu and writes only on Apply', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, transform]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    expect(sourceButtons.every((button) => !button.disabled)).toBe(true);
    expect(sourceButtons.every((button) => button.draggable)).toBe(true);
    expect(container.querySelector('[data-slot="canvas-relational-tree-authoring"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-operation-shelf"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-operation-panel"]')
    ).toBeNull();

    const primarySlot = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-input-slot"][data-position="primary"]'
    );
    const secondarySlot = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-input-slot"][data-position="secondary"]'
    );
    expect(primarySlot).not.toBeNull();
    expect(secondarySlot).not.toBeNull();
    act(() => dragSourceTo(sourceButtons[0]!, primarySlot!));
    expect(primarySlot?.textContent).toContain('customers');
    openOperationMenu(container);
    expect(document.querySelector('[data-slot="dvt-select-operation-projection"]')).not.toBeNull();
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');

    act(() => dragSourceTo(sourceButtons[1]!, secondarySlot!));
    expect(secondarySlot?.textContent).toContain('orders');
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dvt-select-operation-projection"]')).toBeNull();
    const innerJoinOperation = document.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-inner-join"]'
    );
    const draftViewport = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-draft-viewport"]'
    );
    act(() => dragSourceTo(innerJoinOperation!, draftViewport!));
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).not.toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')
        ?.click()
    );
    expect(applied).toHaveLength(0);
    expect(
      container.querySelector(
        '[data-slot="canvas-relational-tree-input-slot"][data-position="primary"]'
      )?.textContent
    ).toContain('Drop a Source here.');

    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    openOperationMenu(container);
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );

    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'inner_join',
    });
  });
});
