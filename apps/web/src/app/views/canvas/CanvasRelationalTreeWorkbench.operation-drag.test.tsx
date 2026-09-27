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

function transfer(): {
  values: Map<string, string>;
  dataTransfer: {
    effectAllowed: string;
    dropEffect: string;
    types: string[];
    getData: (type: string) => string;
    setData: (type: string, value: string) => void;
  };
} {
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
): void {
  const start = new Event('dragstart', { bubbles: true, cancelable: true });
  Object.defineProperty(start, 'dataTransfer', { value: dataTransfer });
  source.dispatchEvent(start);
  const over = new Event('dragover', { bubbles: true, cancelable: true });
  Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(over);
  const drop = new MouseEvent('drop', {
    bubbles: true,
    cancelable: true,
    clientX: 520,
    clientY: 260,
  });
  Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(drop);
  const end = new Event('dragend', { bubbles: true, cancelable: false });
  Object.defineProperty(end, 'dataTransfer', { value: dataTransfer });
  source.dispatchEvent(end);
}

describe('Canvas relational-tree staged operation drag', () => {
  setupWorkbenchTest();

  it('places a Transform and keeps it as an explicit graph node after Input is linked', async () => {
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
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () =>
      drag(
        Array.from(
          container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
        ).find(
          (port) =>
            port.parentElement?.hasAttribute('data-parent-locator') === false &&
            port.parentElement.querySelector('[data-pending="true"]') == null
        )!,
        container.querySelector<HTMLElement>(
          '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
        )!,
        relationTransfer.dataTransfer
      )
    );

    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    expect(container.querySelectorAll('[data-slot="canvas-relational-output-port"]')).toHaveLength(
      3
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).toBeNull();
    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    const stagedOutput = container.querySelector<HTMLElement>(
      '[data-pending-operation="true"] [data-slot="canvas-relational-output-port"]'
    )!;
    await act(async () =>
      drag(
        stagedOutput,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-output-input-port"]')!,
        transfer().dataTransfer
      )
    );
    expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
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
      (port) =>
        port.parentElement?.hasAttribute('data-parent-locator') === false &&
        port.parentElement.querySelector('[data-pending="true"]') == null
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
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () => drag(canonicalOutput, leftInput!, transfer().dataTransfer));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await act(async () => drag(pendingSourceOutput, rightInput!, transfer().dataTransfer));
    await act(async () => Promise.resolve());

    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
    expect(container.querySelector('[data-pending="true"][data-operator="read"]')).not.toBeNull();
    const firstEdge = container.querySelector<SVGElement>(
      '[data-slot="canvas-relational-pending-edge-action"][data-port="0"]'
    )!;
    await act(async () => firstEdge.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
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
      (port) =>
        port.parentElement?.hasAttribute('data-parent-locator') === false &&
        port.parentElement.querySelector('[data-pending="true"]') == null
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
    await act(async () => drag(pendingSourceOutput, rightInput!, transfer().dataTransfer));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      1
    );
    await act(async () =>
      container
        .querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );
    await act(async () => drag(canonicalOutput, leftInput!, transfer().dataTransfer));
    await act(async () => Promise.resolve());

    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-join-input"]')
    ).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('connects producers in either JOIN-port order without prior selection and chains the output', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const target = transformNode();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[customers, orders, target]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        />
      )
    );

    const viewport = (): HTMLElement =>
      container.querySelector<HTMLElement>(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!;
    openOperationMenu(container);
    await act(async () =>
      drag(
        document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-inner-join"]')!,
        viewport(),
        transfer().dataTransfer
      )
    );
    openOperationMenu(container);
    await act(async () =>
      drag(
        document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-aggregate"]')!,
        viewport(),
        transfer().dataTransfer
      )
    );
    for (const name of ['customers', 'orders']) {
      const source = Array.from(
        container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
      ).find((candidate) => candidate.textContent?.includes(name))!;
      await act(async () => drag(source, viewport(), transfer().dataTransfer));
    }

    const producerPorts = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).filter(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    );
    const joinCard = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((card) => card.querySelector('[data-operator="join"]') != null)!;
    const [leftInput, rightInput] = Array.from(
      joinCard.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-input-port"]')
    );
    expect(producerPorts.every((port) => port.getAttribute('aria-pressed') === 'false')).toBe(true);
    await act(async () => drag(producerPorts[1]!, rightInput!, transfer().dataTransfer));
    await act(async () => drag(producerPorts[0]!, leftInput!, transfer().dataTransfer));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      2
    );

    const joinOutput = joinCard.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-output-port"]'
    )!;
    const transformCard = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find(
      (card) => card !== joinCard && card.querySelector('[data-operator="aggregate"]') != null
    )!;
    const transformInput = transformCard.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-input-port"]'
    )!;
    await act(async () => drag(joinOutput, transformInput, transfer().dataTransfer));
    expect(container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')).toHaveLength(
      3
    );
    expect(container.querySelectorAll('[data-pending="true"][data-operator="read"]')).toHaveLength(
      2
    );
  });
});
