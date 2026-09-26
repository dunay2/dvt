// @vitest-environment jsdom
/** Prove staged operations are placed first and connected explicitly afterwards. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
import { appendWorkbenchJoin } from './CanvasRelationalTreeWorkbench.gestures.test-support';

function transfer() {
  const values = new Map<string, string>();
  const types: string[] = [];
  return {
    values,
    dataTransfer: {
      effectAllowed: 'move',
      dropEffect: 'none',
      types,
      getData: (type: string) => values.get(type) ?? '',
      setData: (type: string, value: string) => {
        values.set(type, value);
        if (!types.includes(type)) types.push(type);
      },
    },
  };
}

function drag(
  source: Element,
  target: Element,
  dataTransfer: ReturnType<typeof transfer>['dataTransfer']
) {
  const start = new Event('dragstart', { bubbles: true, cancelable: true });
  Object.defineProperty(start, 'dataTransfer', { value: dataTransfer });
  source.dispatchEvent(start);
  const drop = new MouseEvent('drop', {
    bubbles: true,
    cancelable: true,
    clientX: 520,
    clientY: 260,
  });
  Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(drop);
}

describe('Canvas relational-tree staged operation drag', () => {
  setupWorkbenchTest();

  it('places a Transform without mutating semantics and materializes it only after Input is linked', async () => {
    const source = sourceNode('customers', 'customers');
    const target = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: source.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
            fields: [{ name: 'customer_id', dataType: 'string' }],
          },
          targetNodeId: 'transform',
          outputs: [
            {
              fieldId: 'output:customer_id',
              name: 'customer_id',
              sourceFieldName: 'customer_id',
            },
          ],
        })
      )
    );
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );

    openOperationMenu(container);
    const transform = document.querySelector<HTMLElement>(
      '[data-slot="dvt-select-operation-field-transform"]'
    )!;
    const operationTransfer = transfer();
    await act(async () =>
      drag(
        transform,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-viewport"]')!,
        operationTransfer.dataTransfer
      )
    );

    expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(2);
    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();

    const relationTransfer = transfer();
    await act(async () =>
      drag(
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
        container.querySelector<HTMLElement>(
          '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
        )!,
        relationTransfer.dataTransfer
      )
    );

    expect(container.querySelector('[data-pending-operation="true"]')).toBeNull();
    expect(container.querySelectorAll('[data-operator="project"]')).toHaveLength(2);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(apply).not.toHaveBeenCalled();

    openOperationMenu(container);
    const aggregate = document.querySelector<HTMLElement>(
      '[data-slot="dvt-select-operation-aggregate"]'
    )!;
    const aggregateTransfer = transfer();
    await act(async () =>
      drag(
        aggregate,
        container.querySelector<HTMLElement>(
          '[data-slot="canvas-relational-tree-draft-viewport"]'
        )!,
        aggregateTransfer.dataTransfer
      )
    );
    const aggregateInput = container.querySelector<HTMLElement>(
      '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
    )!;
    const aggregateRelation = transfer();
    await act(async () =>
      drag(
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
        aggregateInput,
        aggregateRelation.dataTransfer
      )
    );
    await act(async () => Promise.resolve());
    expect(container.querySelector('[data-slot="canvas-relational-operator-form"]')).not.toBeNull();

    await act(async () =>
      container
        .querySelector<HTMLFormElement>('[data-slot="canvas-relational-operator-form"]')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    await act(async () => Promise.resolve());
    expect(container.querySelector('[data-pending-operation="true"]')).toBeNull();
    expect(container.querySelector('[data-operator="aggregate"]')).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('connects a staged binary operation through explicit left and right Input ports', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const target = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: customers.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
            fields: [{ name: 'customer_id', dataType: 'string' }],
          },
          targetNodeId: 'transform',
          outputs: [
            {
              fieldId: 'output:customer_id',
              name: 'customer_id',
              sourceFieldName: 'customer_id',
            },
          ],
        })
      )
    );
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[customers, orders, target]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );

    openOperationMenu(container);
    const operationTransfer = transfer();
    await act(async () =>
      drag(
        document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-cross-join"]')!,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-viewport"]')!,
        operationTransfer.dataTransfer
      )
    );
    const sourceTransfer = transfer();
    const ordersCard = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((card) => card.textContent?.includes('orders'))!;
    await act(async () =>
      drag(
        ordersCard,
        container.querySelector<HTMLElement>(
          '[data-slot="canvas-relational-tree-draft-viewport"]'
        )!,
        sourceTransfer.dataTransfer
      )
    );

    const outputPorts = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const canonicalOutput = outputPorts.find(
      (port) => port.parentElement?.querySelector('[data-pending="true"]') == null
    )!;
    const pendingSourceOutput = outputPorts.find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    const [leftInput, rightInput] = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
      )
    );
    await act(async () => drag(canonicalOutput, leftInput!, transfer().dataTransfer));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await act(async () => drag(pendingSourceOutput, rightInput!, transfer().dataTransfer));
    await act(async () => Promise.resolve());

    expect(container.querySelector('[data-pending-operation="true"]')).toBeNull();
    expect(container.querySelector('[data-pending="true"]')).toBeNull();
    expect(container.querySelector('[data-operator="cross"]')).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('configures a staged JOIN after both producers are connected', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const target = applyDvtSubstraitSemanticDocument(
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
    const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[customers, orders, target]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );

    openOperationMenu(container);
    await act(async () =>
      drag(
        document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-inner-join"]')!,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-viewport"]')!,
        transfer().dataTransfer
      )
    );
    const ordersCard = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((card) => card.textContent?.includes('orders'))!;
    await act(async () =>
      drag(
        ordersCard,
        container.querySelector<HTMLElement>(
          '[data-slot="canvas-relational-tree-draft-viewport"]'
        )!,
        transfer().dataTransfer
      )
    );

    const outputPorts = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    );
    const canonicalOutput = outputPorts.find(
      (port) => port.parentElement?.querySelector('[data-pending="true"]') == null
    )!;
    const pendingSourceOutput = outputPorts.find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    const [leftInput, rightInput] = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
      )
    );
    await act(async () => drag(canonicalOutput, leftInput!, transfer().dataTransfer));
    await act(async () => drag(pendingSourceOutput, rightInput!, transfer().dataTransfer));
    await act(async () => Promise.resolve());

    expect(container.querySelector('[data-pending-operation="true"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).not.toBeNull();
    await appendWorkbenchJoin();

    expect(container.querySelector('[data-pending="true"]')).toBeNull();
    expect(container.querySelector('[data-operator="join"]')).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
});
