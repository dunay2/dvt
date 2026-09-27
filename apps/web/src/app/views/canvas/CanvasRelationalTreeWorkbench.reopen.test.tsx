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
  connectWorkbenchOutput,
  instantiateWorkbenchSource,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  setupWorkbenchTest,
  COPY,
  sourceRef,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench reopen', () => {
  setupWorkbenchTest();
  it('reopens an existing JOIN as a producer for a staged JOIN and a pending Source', async () => {
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
    await instantiateWorkbenchSource(countriesButton!);
    await stageWorkbenchOperation('inner-join');
    const staged = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((card) => card.querySelector('[data-operator="join"]') != null)!;
    const [left, right] = Array.from(
      staged.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    const producers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const existingRoot = producers.find(
      (port) =>
        port.parentElement !== staged &&
        port.parentElement?.querySelector('[data-operator="join"]') != null
    )!;
    const pendingCountry = producers.find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () => dragSourceTo(existingRoot, left!));
    await act(async () => dragSourceTo(pendingCountry, right!));
    await connectWorkbenchOutput(
      container,
      staged.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
    expect(applied).toHaveLength(0);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({ mode: 'substrait', shape: 'inner_join' });
    expect(applied[0]?.relationalAuthoringDraft).toMatchObject({
      sources: [{ sourceNodeId: countries.id }],
      operations: [{ operation: 'inner_join', inputs: [expect.any(String), expect.any(String)] }],
    });
  });
});
