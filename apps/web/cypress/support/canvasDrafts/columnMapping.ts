/**
 * Owned concern: construct column mapping, ordering and disconnection scenarios.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';

export function buildColumnMappingDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  {
    columnMappingDisconnected = false,
    columnMappingSecondSource = false,
    columnMappingNotNullCustomer = false,
    columnMappingTemporal = false,
    sourceInspectorOrdering = false,
  }: Pick<
    CanvasDraftScenarioOptions,
    | 'columnMappingDisconnected'
    | 'columnMappingSecondSource'
    | 'columnMappingNotNullCustomer'
    | 'columnMappingTemporal'
    | 'sourceInspectorOrdering'
  >
): CanvasAuthoringDraft {
  const columns = [
    { name: 'order_id', type: 'integer' },
    {
      name: 'customer',
      type: 'text',
      ...(columnMappingSecondSource || columnMappingNotNullCustomer ? { nullable: false } : {}),
    },
    { name: 'amount', type: 'numeric' },
    { name: 'status', type: 'text' },
    { name: 'created_at', type: columnMappingTemporal ? 'timestamp with time zone' : 'timestamp' },
    { name: 'region', type: 'text' },
  ].map((column) => ({ ...column, ...(sourceInspectorOrdering ? { nullable: false } : {}) }));
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      'source-orders': { x: 40, y: columnMappingSecondSource ? 80 : 140 },
      ...(columnMappingSecondSource ? { 'source-health-check': { x: 40, y: 440 } } : {}),
      'model-orders': { x: 620, y: 140 },
      ...(sourceInspectorOrdering ? { 'model-orders-secondary': { x: 620, y: 440 } } : {}),
      'sink-orders': { x: 1200, y: 140 },
    },
    nodes: [
      {
        id: 'source-orders',
        name: 'Orders source',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['source'],
        metadata: {
          schema: 'raw',
          tableName: 'orders',
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'canvas-e2e-postgres',
              provider: 'postgres',
            },
            sourceObjectId: 'raw.orders',
          },
          columns,
        },
      },
      ...(columnMappingSecondSource
        ? [
            {
              id: 'source-health-check',
              name: 'Health check',
              pluginId: 'dvt.warehouse-source',
              kind: 'dvt:source',
              role: 'input' as const,
              status: 'idle' as const,
              tags: ['source'],
              metadata: {
                schema: 'core',
                tableName: 'health_check',
                connectedSourceRef: {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'canvas-e2e-postgres',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'core.health_check',
                },
                columns: [
                  { name: 'id', type: 'integer', nullable: false },
                  { name: 'created_at', type: 'timestamp without time zone' },
                ],
              },
            },
          ]
        : []),
      {
        id: 'model-orders',
        name: 'Orders model',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['transform'],
        metadata: {},
      },
      ...(sourceInspectorOrdering
        ? [
            {
              id: 'model-orders-secondary',
              name: 'Orders model secondary',
              pluginId: 'dvt',
              kind: 'dvt:transform',
              role: 'transform' as const,
              status: 'idle' as const,
              tags: ['transform'],
              metadata: {},
            },
          ]
        : []),
      {
        id: 'sink-orders',
        name: 'Orders sink',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: ['sink'],
        metadata: { columns },
      },
    ],
    edges: [
      ...(columnMappingDisconnected
        ? []
        : [
            {
              id: 'edge-source-model',
              sourceId: 'source-orders',
              targetId: 'model-orders',
              relation: 'lineage' as const,
            },
          ]),
      ...(sourceInspectorOrdering
        ? [
            {
              id: 'edge-source-model-secondary',
              sourceId: 'source-orders',
              targetId: 'model-orders-secondary',
              relation: 'lineage' as const,
            },
          ]
        : []),
      {
        id: 'edge-model-sink',
        sourceId: 'model-orders',
        targetId: 'sink-orders',
        relation: 'lineage',
      },
    ],
  });
}
