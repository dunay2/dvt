import { describe, expect, it } from 'vitest';

import clientFixture from './fixtures/client.json';
import ordersFixture from './fixtures/orders.json';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';
import { buildSemanticWorkbenchFixture } from './semanticWorkbenchFixture';

describe('semanticWorkbenchDataset', () => {
  it('loads coherent reusable Orders and Client fixtures', () => {
    const orders = loadSemanticWorkbenchDataset(ordersFixture);
    const clients = loadSemanticWorkbenchDataset(clientFixture);

    expect([orders.tableName, clients.tableName]).toEqual(['orders', 'client']);
    expect(orders.rows).toHaveLength(8);
    expect(clients.rows).toHaveLength(5);
    expect(orders.columns.map((column) => [column.name, column.type])).toContainEqual([
      'client_id',
      'text',
    ]);
    expect(() => buildSemanticWorkbenchFixture()).not.toThrow();
  });

  it('rejects a row whose value does not match its declared field type', () => {
    const malformed = structuredClone(ordersFixture);
    malformed.rows[0]!.amount = 'not-a-number' as unknown as number;

    expect(() => loadSemanticWorkbenchDataset(malformed)).toThrow(
      'orders row 1 field "amount" must be numeric.'
    );
  });

  it('rejects duplicate primary keys and broken Client references', () => {
    const duplicate = structuredClone(ordersFixture);
    duplicate.rows[1]!.order_id = duplicate.rows[0]!.order_id;
    expect(() => loadSemanticWorkbenchDataset(duplicate)).toThrow(
      'orders primary key "order_id" must be unique.'
    );

    const brokenOrders = structuredClone(ordersFixture);
    brokenOrders.rows[0]!.client_id = 'CLI-UNKNOWN';
    expect(() => buildSemanticWorkbenchFixture({ orders: brokenOrders })).toThrow(
      'orders.client_id references missing client.client_id value "CLI-UNKNOWN".'
    );
  });
});
