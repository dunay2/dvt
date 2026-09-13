import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { resolveDvtSubstraitJoinAppendCandidates } from './canvasDvtSubstraitJoinSourceResolution';

function sourceNode(args: {
  id: string;
  table: string;
  connectionId?: string;
  columns: readonly string[];
}): CanonicalNode {
  return {
    id: args.id,
    name: args.table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      schema: 'raw',
      tableName: args.table,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: args.connectionId ?? 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${args.table}`,
      },
      columns: args.columns.map((name) => ({ name, type: 'text' })),
    },
  };
}

function joinSource(
  node: CanonicalNode
): Parameters<typeof createDvtSubstraitInnerJoinDraft>[0]['left'] {
  const metadata = node.metadata!;
  return {
    nodeId: node.id,
    schema: metadata.schema as string,
    table: metadata.tableName as string,
    sourceRef: metadata.connectedSourceRef as never,
  };
}

describe('canvasDvtSubstraitJoinSourceResolution', () => {
  it('returns only connected, same-connection Sources not already present in the JOIN draft', () => {
    const customers = sourceNode({
      id: 'customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
    });
    const orders = sourceNode({
      id: 'orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
    });
    const payments = sourceNode({
      id: 'payments',
      table: 'payments',
      columns: ['payment_id', 'customer_id'],
    });
    const shipments = sourceNode({
      id: 'shipments',
      table: 'shipments',
      connectionId: 'warehouse-other',
      columns: ['shipment_id', 'customer_id'],
    });
    const target: CanonicalNode = {
      id: 'join',
      name: 'Join',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const draft = createDvtSubstraitInnerJoinDraft({
      left: joinSource(customers),
      right: joinSource(orders),
      targetNodeId: target.id,
    });

    const candidates = resolveDvtSubstraitJoinAppendCandidates({
      targetNode: target,
      nodes: [customers, orders, payments, shipments, target],
      edges: [
        { id: 'e-customers', sourceId: customers.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-orders', sourceId: orders.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-payments', sourceId: payments.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-shipments', sourceId: shipments.id, targetId: target.id, relation: 'lineage' },
      ],
      draft,
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        source: expect.objectContaining({ nodeId: payments.id, table: 'payments' }),
        fields: ['payment_id', 'customer_id'],
      }),
    ]);
  });
});
