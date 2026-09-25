// @vitest-environment jsdom
/** Owned concern: relational workbench reopen behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  COPY,
  sourceRef,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench reopen', () => {
  setupWorkbenchTest();
  it('opens an existing JOIN as the structural draft before appending a pending Source', async () => {
    const customers = {
      ...sourceNode('customers', 'customers'),
      metadata: {
        ...sourceNode('customers', 'customers').metadata,
        columns: [
          { name: 'customer_id', type: 'text' },
          { name: 'name', type: 'text' },
        ],
      },
    };
    const orders = {
      ...sourceNode('orders', 'orders'),
      metadata: {
        ...sourceNode('orders', 'orders').metadata,
        columns: [
          { name: 'order_id', type: 'text' },
          { name: 'customer_id', type: 'text' },
        ],
      },
    };
    const countries = {
      ...sourceNode('countries', 'countries'),
      metadata: {
        ...sourceNode('countries', 'countries').metadata,
        columns: [
          { name: 'country_id', type: 'text' },
          { name: 'customer_id', type: 'text' },
        ],
      },
    };
    const baseDraft = createCustomerOrdersJoin({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: sourceRef('customers'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      targetNodeId: 'transform',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(baseDraft)
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id)]}
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

    const start = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
    );
    expect(start).not.toBeNull();
    await act(async () => start?.click());
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-edit"]')!.click()
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-operation-output-tab"]')!
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    );
    expect(container.querySelector('[data-value="output"]')?.getAttribute('data-state')).toBe(
      'active'
    );

    const countriesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('countries'));
    expect(countriesButton?.disabled).toBe(false);
    await act(async () => countriesButton?.click());
    expect(container.querySelector('[data-slot="canvas-operation-output-tab"]')).toBeNull();
    expect(container.querySelector('[data-value="properties"]')?.getAttribute('data-state')).toBe(
      'active'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-input"]')
    ).not.toBeNull();
    expect(
      Array.from(
        container.querySelectorAll<HTMLOptionElement>(
          '[data-slot="canvas-relational-tree-existing-field"] option'
        )
      ).map((option) => option.textContent)
    ).toEqual(expect.arrayContaining(['customer_id', 'order_id']));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(applied).toHaveLength(0);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
  });
});
