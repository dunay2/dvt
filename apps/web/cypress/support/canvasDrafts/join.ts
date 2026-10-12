/**
 * Owned concern: construct pending and configured JOIN scenarios from connected source identities.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import type { CanonicalNode } from '../../../src/app/types/canonical';
import { encodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { createCustomerOrdersJoin } from '../../../src/app/views/canvas/canvasJoin.test-support';
import type { ConnectedRelationSource } from '../../../src/app/views/canvas/canvasSourceRelation';

import {
  buildScenarioDraft,
  type CanvasAuthoringDraft,
  type CanvasDraftScenarioOptions,
} from './scenario';

export function buildJoinDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  {
    substraitPendingComposition = false,
    substraitCompositionColumnType = 'string',
    substraitNInputJoin = false,
  }: Pick<
    CanvasDraftScenarioOptions,
    'substraitPendingComposition' | 'substraitCompositionColumnType' | 'substraitNInputJoin'
  >
): CanvasAuthoringDraft {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-a',
    provider: 'postgres' as const,
  };
  const sourceRef = (table: string): ConnectedRelationSource['sourceRef'] => ({
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef,
    sourceObjectId: `relation/dvt/public/${table}`,
  });
  const input = (table: string): ConnectedRelationSource => ({
    nodeId: `source-${table}`,
    schema: 'public',
    table,
    sourceRef: sourceRef(table),
  });
  const semanticDocument = encodeDvtSubstraitSemanticDocument(
    createCustomerOrdersJoin({
      left: input('customers'),
      right: input('orders'),
      targetNodeId: 'join-transform',
    })
  );
  const tables = [
    {
      table: 'customers',
      columns: [
        { name: 'customer_id', type: substraitCompositionColumnType },
        { name: 'name', type: 'string' },
      ],
    },
    {
      table: 'orders',
      columns: [
        { name: 'order_id', type: 'string' },
        { name: 'customer_id', type: substraitCompositionColumnType },
      ],
    },
    ...(substraitNInputJoin
      ? [
          {
            table: 'shipments',
            columns: [
              { name: 'shipment_id', type: 'string' },
              { name: 'customer_id', type: 'string' },
            ],
          },
          {
            table: 'tickets',
            columns: [
              { name: 'ticket_id', type: 'string' },
              { name: 'customer_id', type: 'string' },
            ],
          },
        ]
      : []),
  ];
  const sources: CanonicalNode[] = tables.map(({ table, columns }) => ({
    id: `source-${table}`,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: { schema: 'public', tableName: table, columns, connectedSourceRef: sourceRef(table) },
  }));
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      ...Object.fromEntries(
        sources.map((node, index) => [node.id, { x: 40, y: 100 + index * 240 }])
      ),
      'join-transform': { x: 420, y: 220 },
    },
    nodes: [
      ...sources,
      {
        id: 'join-transform',
        name: 'Customer orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: substraitPendingComposition
          ? {}
          : {
              transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
            },
      },
    ],
    edges: tables.map(({ table }) => ({
      id: `${table}-join`,
      sourceId: `source-${table}`,
      targetId: 'join-transform',
      relation: 'lineage',
    })),
  });
}
