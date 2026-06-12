import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildGraphNodeCardReadModel } from './graphNodeCardReadModel';

function buildNode(partial: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'node-1',
    name: 'Node 1',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    ...partial,
  };
}

describe('buildGraphNodeCardReadModel', () => {
  it('uses a DVT card strategy for operational table metrics', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dvt:source',
        pluginId: 'dvt',
        name: 'public.orders',
        metadata: {
          database: 'warehouse',
          schema: 'public',
          table: 'orders',
          rowCount: 18240,
          byteSize: 4096000,
          columns: [
            { name: 'order_id', type: 'integer' },
            { name: 'customer_id', type: 'text' },
          ],
        },
      }),
      {}
    );

    expect(model.subtitle).toBe('warehouse.public.orders');
    expect(model.metrics).toEqual([
      { id: 'rows', label: 'Rows', value: '18.2k' },
      { id: 'bytes', label: 'Size', value: '3.9 MB' },
      { id: 'columns', label: 'Columns', value: '2' },
    ]);
  });

  it('uses a DBT card strategy for model context instead of DVT table ownership', () => {
    const model = buildGraphNodeCardReadModel(
      buildNode({
        kind: 'dbt:model',
        pluginId: 'dbt',
        name: 'fct_orders',
        path: 'models/marts/fct_orders.sql',
        metadata: {
          package: 'analytics',
          dependencies: ['source.raw.orders', 'ref.stg_customers'],
          config: {
            materialized: 'incremental',
          },
          columns: [{ name: 'order_id', type: 'integer' }],
        },
      }),
      {}
    );

    expect(model.subtitle).toBe('analytics');
    expect(model.metrics).toEqual([
      { id: 'materialization', label: 'Mat.', value: 'incremental' },
      { id: 'dependencies', label: 'Deps', value: '2' },
      { id: 'columns', label: 'Columns', value: '1' },
    ]);
  });
});
