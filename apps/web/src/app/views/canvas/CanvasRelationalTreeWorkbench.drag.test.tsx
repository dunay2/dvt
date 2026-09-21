// @vitest-environment jsdom
/** Owned concern: relational workbench drag behavior. */
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

describe('Canvas relational-tree Workbench drag', () => {
  setupWorkbenchTest();
  it('keeps the applied tree mounted during drag and stages a second input only on drop', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
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

    const appliedTree = container.querySelector('[data-slot="canvas-relational-tree"]');
    openOperationMenu(container);
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');
    const ordersButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('orders'));
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      getData: (type: string) => values.get(type) ?? '',
      setData: (type: string, value: string) => values.set(type, value),
    };
    const dragStart = new Event('dragstart', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });

    act(() => {
      ordersButton?.dispatchEvent(dragStart);
    });

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    values.set('application/x-dvt-relational-source', 'not-connected');
    act(() => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    values.set('application/x-dvt-relational-source', orders.id);
    act(() => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    openOperationMenu(container);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="read"]')?.textContent).toContain('customers');
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.getAttribute('aria-disabled')
    ).toBe('false');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
  });
});
