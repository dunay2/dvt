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
  it('projects every connected source with its admitted canonical JOIN type', () => {
    const orders = source('orders', [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'active', type: 'boolean' },
      { name: 'sequence', type: 'bigint' },
      { name: 'amount', type: 'double precision' },
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
          { name: 'order_id', joinDataType: null },
          { name: 'customer', joinDataType: 'string' },
          { name: 'active', joinDataType: 'bool' },
          { name: 'sequence', joinDataType: 'i64' },
          { name: 'amount', joinDataType: 'fp64' },
        ],
      },
      {
        nodeId: audits.id,
        fields: [
          { name: 'event_id', joinDataType: 'string' },
          { name: 'occurred_at', joinDataType: 'precisionTimestampTz' },
        ],
      },
    ]);
  });
});
