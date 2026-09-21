// @vitest-environment jsdom
/** Owned concern: relational workbench pending behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
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
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

describe('Canvas relational-tree Workbench pending', () => {
  setupWorkbenchTest();
  it('keeps a partial canonical tree visible until guided authoring starts', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const orderDetails = sourceNode('order-details', 'order_details');
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: customers.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
            fields: [{ name: 'customers_id', dataType: 'string' }],
          },
          targetNodeId: 'transform',
          outputs: [
            {
              fieldId: 'output:customers_id',
              name: 'customers_id',
              sourceFieldName: 'customers_id',
            },
          ],
        })
      )
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, orderDetails, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(orderDetails.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'PROJECT'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    expect(sourceButtons).toHaveLength(3);
    expect(sourceButtons.every((button) => button.draggable)).toBe(true);

    const ordersButton = sourceButtons.find((button) => button.textContent?.includes('orders'));
    const detailsButton = sourceButtons.find((button) =>
      button.textContent?.includes('order_details')
    );
    expect(ordersButton?.disabled).toBe(false);
    expect(detailsButton?.disabled).toBe(false);
    act(() => ordersButton?.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="read"]')?.textContent).toContain('customers');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() => detailsButton?.click());
    openOperationMenu(container);
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dvt-select-operation-inner-join"]')).not.toBeNull();
  });
});
