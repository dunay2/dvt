import { describe, expect, it } from 'vitest';

import type { DbtNode } from '../../types/dbt';
import { projectLineageGraph } from './useLineageViewData';

const modelNode: DbtNode = {
  id: 'model.orders',
  name: 'orders',
  type: 'MODEL',
  package: 'analytics',
  path: 'models/orders.sql',
  status: 'idle',
  tags: [],
  dependencies: ['source.orders'],
  columns: [{ name: 'order_id', type: 'integer', nullable: false }],
};

const lineageEdge = {
  id: 'edge-1',
  source: 'source.orders',
  target: 'model.orders',
  type: 'ref' as const,
};

describe('Lineage graph projection', () => {
  it('projects the workspace DBT snapshot without selecting a Canvas runtime', () => {
    const result = projectLineageGraph([modelNode], [lineageEdge]);

    expect(result).toMatchObject({
      canonicalNodes: [
        {
          id: 'model.orders',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          metadata: {
            package: 'analytics',
            dependencies: ['source.orders'],
            columns: [{ name: 'order_id', type: 'integer', nullable: false }],
          },
        },
      ],
      canonicalEdges: [
        {
          id: 'edge-1',
          sourceId: 'source.orders',
          targetId: 'model.orders',
          relation: 'lineage',
        },
      ],
      projectionError: null,
    });
  });

  it('discards partial projection when trusted snapshot access throws', () => {
    const invalidNode = {
      ...modelNode,
      get type(): DbtNode['type'] {
        throw new Error('node projection failed');
      },
    };
    const result = projectLineageGraph([invalidNode], [lineageEdge]);

    expect(result.canonicalNodes).toEqual([]);
    expect(result.canonicalEdges).toEqual([]);
    expect(result.projectionError?.message).toBe('node projection failed');
  });
});
