// @vitest-environment jsdom
/** Owned concern: relational workbench mixed-cross behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
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
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import {
  connectWorkbenchOutput,
  instantiateWorkbenchSource,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';

describe('Canvas relational-tree Workbench mixed-cross', () => {
  setupWorkbenchTest();
  it('preserves an existing LEFT JOIN while a staged CROSS consumes it and a new Source', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = {
      ...sourceNode('countries', 'countries'),
      metadata: {
        ...sourceNode('countries', 'countries').metadata,
        columns: [{ name: 'customer_id', type: 'text' }],
      },
    };
    const leftJoin = createCustomerOrdersJoin({
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
      joinType: JoinRel_JoinType.LEFT,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(leftJoin)
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

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
        )
        ?.click()
    );
    const countriesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('countries'));
    await instantiateWorkbenchSource(countriesButton!);
    openOperationMenu(container);
    const crossButton = document.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(countriesButton?.disabled).toBe(false);
    expect(crossButton).not.toBeNull();
    expect(crossButton?.getAttribute('aria-disabled')).toBe('false');
    await act(async () => crossButton?.click());
    const staged = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((card) => card.querySelector('[data-operator="cross"]') != null)!;
    const [left, right] = Array.from(
      staged.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    const producers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const existingJoin = producers.find(
      (port) =>
        port.parentElement !== staged &&
        port.parentElement?.querySelector('[data-operator="join"]') != null
    )!;
    const pendingCountry = producers.find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    await act(async () => dragSourceTo(existingJoin, left!));
    await act(async () => dragSourceTo(pendingCountry, right!));
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await connectWorkbenchOutput(
      container,
      staged.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied[0]?.dvt).toMatchObject({ mode: 'substrait', shape: 'left_join' });
    const relational = applied[0]?.relationalAuthoringDraft;
    expect(relational).toMatchObject({
      sources: [{ sourceNodeId: countries.id }],
      operations: [{ operation: 'cross_join', inputs: [expect.any(String), expect.any(String)] }],
    });
    expect(relational?.outputRelationId).toBe(relational?.operations[0]?.relationId);
  });
});
