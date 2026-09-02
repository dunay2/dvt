import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';

function source(
  id: string,
  columns: readonly Readonly<{ name: string; type: string }>[]
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'raw',
      tableName: id,
      columns,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${id}`,
      },
    },
  };
}

describe('Canvas DVT composition input catalog', () => {
  it('projects every connected source and marks fields admitted by the string join profile', () => {
    const orders = source('orders', [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ]);
    const audits = source('auth_audit_events', [
      { name: 'event_id', type: 'varchar' },
      { name: 'occurred_at', type: 'timestamp with time zone' },
    ]);

    expect(
      resolveCanvasDvtCompositionInputs({
        targetNodeId: 'transform',
        nodes: [orders, audits],
        edges: [
          { sourceId: orders.id, targetId: 'transform' },
          { sourceId: audits.id, targetId: 'transform' },
        ],
      })
    ).toMatchObject([
      {
        nodeId: orders.id,
        fields: [
          { name: 'order_id', stringCompatible: false },
          { name: 'customer', stringCompatible: true },
        ],
      },
      {
        nodeId: audits.id,
        fields: [
          { name: 'event_id', stringCompatible: true },
          { name: 'occurred_at', stringCompatible: false },
        ],
      },
    ]);
  });
});
