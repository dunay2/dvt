import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';

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

describe('DBT model chain projection', () => {
  it('carries active outputs through an arbitrary generated-model chain', () => {
    const first = model('model-1', source.id, [
      { name: 'customer', output: true },
      { name: 'order_id', output: false },
    ]);
    const second = model('model-2', first.id);
    const third = model('model-3', second.id);
    const nodes = [source, first, second, third];
    const edges: CanonicalEdge[] = [
      { id: 'e1', sourceId: source.id, targetId: first.id, relation: 'lineage' },
      { id: 'e2', sourceId: first.id, targetId: second.id, relation: 'lineage' },
      { id: 'e3', sourceId: second.id, targetId: third.id, relation: 'lineage' },
    ];

    expect(projectDbtModelArtifact({ modelNode: third, nodes, edges })).toMatchObject({
      ok: true,
      artifact: {
        outputColumns: ['customer'],
        body: 'select\n  origin."customer" as "customer"\nfrom {{ ref(\'model_2\') }} as origin',
      },
    });
  });
});
