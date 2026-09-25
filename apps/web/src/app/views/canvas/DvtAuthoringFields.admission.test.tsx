// @vitest-environment jsdom
import React from 'react';
import type { CanonicalEdge } from '../../types/canonical';
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
describe('DVT composition admission', () => {
  const view = useAuthoringFieldsHarness();

  it('does not offer INNER JOIN when the connected datasets use different connections', async () => {
    const customers = buildJoinWarehouseSourceNode({
      id: 'source-customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
      connectionId: 'warehouse-a',
    });
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
      connectionId: 'warehouse-b',
    });
    const transform = buildDvtNode('dvt:transform');
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'customers-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    view.renderFields(
      transform,
      undefined,
      undefined,
      [customers, orders, transform],
      edges,
      'code'
    );

    expect(
      view.container.querySelector('[data-slot="dvt-start-configured-inner-join"]')
    ).toBeNull();
    const choice = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-inner-join"]'
    );
    expect(choice?.disabled).toBe(true);
    expect(choice?.textContent).toContain('Target unavailable');
  });
});
