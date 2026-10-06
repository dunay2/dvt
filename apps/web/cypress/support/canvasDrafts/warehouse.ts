/**
 * Owned concern: construct the imported warehouse source scenario.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft } from './scenario';

export function buildWarehouseDraft(canvas: CanvasAuthoringDraft['canvas']): CanvasAuthoringDraft {
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      src_erp_orders: { x: 520, y: 300 },
    },
    nodes: [
      {
        id: 'src_erp_orders',
        name: 'src_erp_orders',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['source', 'warehouse'],
        path: 'models/sources/src_erp.yml',
        metadata: {
          database: 'RAW',
          schema: 'ERP',
          tableName: 'ORDERS',
          rowCount: 1500,
          byteSize: 4096000,
          dbt: {
            packageName: 'analytics',
            sourceName: 'raw',
            databaseName: 'RAW',
            schemaName: 'ERP',
            tableName: 'ORDERS',
          },
          columns: [
            { name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'discount_code', type: 'TEXT', nullable: true },
          ],
          constraints: [
            {
              name: 'orders_order_id_not_null',
              type: 'not_null',
              expression: 'order_id is not null',
            },
          ],
        },
      },
    ],
    edges: [],
  });
}
