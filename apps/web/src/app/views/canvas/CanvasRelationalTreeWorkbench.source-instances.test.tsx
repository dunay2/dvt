// @vitest-environment jsdom
/** Source drops create independent, discardable relation occurrences. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { dropWorkbenchSource } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Canvas relational-tree source instances', () => {
  setupWorkbenchTest();

  it('creates distinct instances independently of JOIN field admission', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
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

    await dropWorkbenchSource(customers.id);
    await dropWorkbenchSource(customers.id);
    await dropWorkbenchSource(orders.id);
    const cards = Array.from(container.querySelectorAll('[data-pending="true"]'));
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.getAttribute('data-relation-id'))).size).toBe(3);
    expect(
      cards.map(
        (card) => card.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent
      )
    ).toEqual(['customers', 'customers 2', 'orders']);
    expect(apply).not.toHaveBeenCalled();
  });

  it('discards repeated pending instances without writes', async () => {
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
    for (let ordinal = 0; ordinal < 3; ordinal++)
      await dropWorkbenchSource(graph.source.id, 400 + ordinal * 40);

    const reads = Array.from(container.querySelectorAll('[data-operator="read"]'));
    const ids = reads.map((node) => node.getAttribute('data-relation-id'));
    expect(new Set(ids).size).toBe(original.length + 3);
    expect(ids).toEqual(expect.arrayContaining(original));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(original.length);
    expect(apply).not.toHaveBeenCalled();
  });
});
