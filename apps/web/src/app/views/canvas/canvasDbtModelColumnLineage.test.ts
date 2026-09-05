import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/raw/orders',
    },
    sourceName: 'raw',
    schema: 'raw',
    tableName: 'orders',
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

function model(
  id: string,
  selectedSourceId: string,
  projectionColumns?: readonly Readonly<{ name: string; output: boolean }>[]
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        selectedSourceId,
        ...(projectionColumns == null ? {} : { projectionColumns }),
      },
    },
  };
}

describe('DBT model column lineage', () => {
  it('does not infer lineage from DBT field names without stable field references', () => {
    const first = model('model-1', source.id);
    const second = model('model-2', first.id, [
      { name: 'order_id', output: true },
      { name: 'customer', output: false },
    ]);
    const nodes = [source, first, second];
    const edges: CanonicalEdge[] = [
      { id: 'e1', sourceId: source.id, targetId: first.id, relation: 'lineage' },
      { id: 'e2', sourceId: first.id, targetId: second.id, relation: 'lineage' },
    ];

    const projected = projectCanvasColumnLineage({
      nodes,
      edges,
      expandedNodeIds: new Set(nodes.map((node) => node.id)),
    });

    expect(projected).toEqual([]);
  });
});
