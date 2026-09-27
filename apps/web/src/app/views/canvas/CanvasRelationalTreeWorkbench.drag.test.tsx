// @vitest-environment jsdom
/** Owned concern: relational workbench drag behavior. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
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
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import { createSourceRelation } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';

async function dropSource(sourceId: string, x = 400, y = 300): Promise<void> {
  const drop = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(drop, 'dataTransfer', {
    value: {
      types: ['application/x-dvt-relational-source'],
      getData: (type: string) => (type === 'application/x-dvt-relational-source' ? sourceId : ''),
    },
  });
  await act(async () =>
    container
      .querySelector(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!
      .dispatchEvent(drop)
  );
}

describe('Canvas relational-tree Workbench drag', () => {
  setupWorkbenchTest();
  it('creates different source instances independently of JOIN field admission', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    orders.metadata = {
      ...orders.metadata,
      columns: [
        { name: 'order_id', type: 'integer' },
        { name: 'amount', type: 'numeric' },
      ],
    };
    const target = transformNode();
    const apply = vi.fn();
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
    await dropSource(customers.id);
    await dropSource(customers.id);
    await dropSource(orders.id);
    const cards = Array.from(container.querySelectorAll('[data-pending="true"]'));
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.getAttribute('data-relation-id'))).size).toBe(3);
    expect(
      cards.map(
        (card) => card.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent
      )
    ).toEqual(['customers', 'customers 2', 'orders']);
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
  it.each(['new', 'saved'] as const)(
    'removes the final instance from a %s model and cancels without writes',
    async (state) => {
      const source = sourceNode('customers', 'customers');
      const read = createSourceRelation(
        {
          source: {
            nodeId: source.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
          },
          fields: ['customers_id'],
        },
        1
      );
      const target =
        state === 'new'
          ? transformNode()
          : applyDvtSubstraitSemanticDocument(
              transformNode(),
              encodeDvtSubstraitSemanticDocument(createSourceDocument([read], read))
            );
      const apply = vi.fn(() => ({ outcome: 'no_changes' as const }));
      const handle =
        React.createRef<
          import('./useCanvasRelationalTreeWorkbenchHandle').CanvasRelationalTreeWorkbenchHandle
        >();
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            ref={handle}
            transformNode={target}
            nodes={[source, target]}
            edges={[edge(source.id)]}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
      if (state === 'new') {
        await dropSource(source.id);
      }
      const card = container.querySelector<HTMLElement>('[data-operator="read"]')!;
      await act(async () => card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })));
      await act(async () =>
        document
          .querySelector<HTMLElement>('[data-slot="canvas-relational-remove-source"]')!
          .click()
      );
      const confirm = document.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-removal-confirm"]'
      );
      expect(confirm).toBeNull();
      expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(0);
      expect(container.querySelector('[data-slot="canvas-relational-tree-output"]')).not.toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-tree-layout"] > svg path')
      ).toBeNull();
      expect(handle.current!.hasUnappliedChanges).toBe(true);
      expect(handle.current!.canApply).toBe(true);
      expect(apply).not.toHaveBeenCalled();
      await dropSource(source.id);
      expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
      await act(async () => handle.current!.cancel());
      expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
      expect(handle.current!.hasUnappliedChanges).toBe(false);
      if (state === 'saved')
        expect(
          container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
        ).toBe(read.binding.relationId);
      expect(apply).not.toHaveBeenCalled();
    }
  );
  it('creates independent pending instances on repeated drops and discards them without writes', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    const original = Array.from(container.querySelectorAll('[data-operator="read"]'), (node) =>
      node.getAttribute('data-relation-id')
    );
    for (let ordinal = 0; ordinal < 3; ordinal++) {
      await dropSource(graph.source.id, 400 + ordinal * 40);
      expect(
        container.querySelectorAll('[data-operator="read"][data-pending="true"]')
      ).toHaveLength(ordinal + 1);
    }
    const reads = Array.from(container.querySelectorAll('[data-operator="read"]'));
    const ids = reads.map((node) => node.getAttribute('data-relation-id'));
    expect(new Set(ids).size).toBe(original.length + 3);
    expect(ids).toEqual(expect.arrayContaining(original));
    const labels = reads.map(
      (node) => node.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent
    );
    expect(new Set(labels).size).toBe(reads.length);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(original.length);
    expect(apply).not.toHaveBeenCalled();
  });
  it('connects a dropped instance to an explicit projection without replacing its identity', async () => {
    const source = sourceNode('customers', 'customers');
    const target = transformNode();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        />
      )
    );
    await dropSource(source.id);
    const pending = container.querySelector<HTMLButtonElement>('[data-pending="true"]')!;
    const id = pending.getAttribute('data-relation-id');
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(1);
    expect(container.querySelector('[data-operator="join"]')).toBeNull();
    openOperationMenu(container);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')!
        .click()
    );
    const projection = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((card) => card.querySelector('[data-operator="project"]') != null)!;
    const producer = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    )!;
    await act(async () =>
      dragSourceTo(
        producer,
        projection.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
      )
    );
    expect(container.querySelector('[data-pending="true"]')).not.toBeNull();
    expect(
      container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
    ).toBe(id);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    await act(async () =>
      dragSourceTo(
        projection.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-output-input-port"]')!
      )
    );
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .disabled
    ).toBe(false);
  });
  it('rejects catalogue drops in a read-only model', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: false, onApplyNodeDraft: apply }}
        />
      )
    );
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source"]')
        ?.getAttribute('draggable')
    ).toBe('false');
    await dropSource(graph.source.id);
    expect(container.querySelector('[data-slot="source-occurrence-add"]')).toBeNull();
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-operator="read"]')!.click()
    );
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(apply).not.toHaveBeenCalled();
  });
  it('keeps the applied tree mounted during drag and stages a second input only on drop', async () => {
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

    await act(async () => {
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
      document.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.draggable
    ).toBe(true);
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

    await act(async () => {
      ordersButton?.dispatchEvent(dragStart);
    });

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
    const drop = new MouseEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 200,
    });
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    values.set('application/x-dvt-relational-source', 'not-connected');
    await act(async () => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    values.set('application/x-dvt-relational-source', orders.id);
    await act(async () => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-pending="true"]')!.click()
    );
    openOperationMenu(container);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="read"]')?.textContent).toContain('customers');
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.getAttribute('aria-disabled')
    ).toBe('false');
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
        .click()
    );
    expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(false);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
  });

  it('saves and reopens an incomplete occurrence with the same identity', async () => {
    const source = sourceNode('customers', 'customers');
    const target = transformNode();
    const saved: CanvasInspectorNodeDraft[] = [];
    const authoring = {
      canEditNode: true,
      onApplyNodeDraft: (_id: string, draft: CanvasInspectorNodeDraft) => {
        saved.push(draft);
        return { outcome: 'no_changes' as const };
      },
    };
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={authoring}
        />
      )
    );

    await dropSource(source.id, 460, 240);
    const relationId = container
      .querySelector<HTMLElement>('[data-pending="true"]')!
      .getAttribute('data-relation-id');
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );

    const persisted = saved[0]!;
    expect(persisted.relationalAuthoringDraft?.sources[0]?.relationId).toBe(relationId);
    expect(persisted.relationalAuthoringDraft?.positions[relationId!]).toBeDefined();
    const reopened = applyCanvasInspectorNodeDraft(target, persisted);
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={reopened}
          nodes={[source, reopened]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={authoring}
        />
      )
    );

    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-pending="true"]')?.getAttribute('data-relation-id')).toBe(
      relationId
    );
  });
});
