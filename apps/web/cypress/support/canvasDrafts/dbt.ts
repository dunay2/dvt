/**
 * Owned concern: construct dbt graph scenarios and their source metric evidence.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import { type SourceObjectMetricEvidence } from '@dvt/contracts';

import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';

export function buildDbtDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  {
    authoringGenerated = false,
    longNodeNames = false,
  }: Pick<CanvasDraftScenarioOptions, 'authoringGenerated' | 'longNodeNames'>
): CanvasAuthoringDraft {
  const sourceMetricEvidence = (rowCount: number): SourceObjectMetricEvidence => ({
    observedAt: '2026-09-05T10:00:00.000Z',
    observationScope: { kind: 'snapshot' as const },
    rowCount: {
      value: rowCount,
      provenance: 'estimated' as const,
      method: 'provider-statistics',
      confidence: 'medium' as const,
    },
    byteSize: {
      value: 4_096_000,
      provenance: 'measured' as const,
      method: 'provider-storage-metadata',
      confidence: 'exact' as const,
      basis: 'physical-allocation' as const,
    },
  });
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      raw_orders: { x: 40, y: 120 },
      warehouse_payments: { x: 40, y: 320 },
      orders_model: { x: 360, y: 220 },
    },
    nodes: [
      {
        id: 'raw_orders',
        name: longNodeNames
          ? 'Imported source for dvt.raw.orders in the local governed environment with a complete name'
          : 'raw_orders',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['source'],
        metadata: {
          sourceMetricEvidence: sourceMetricEvidence(18_240),
          dbt: {
            packageName: 'analytics',
            sourceName: 'raw',
            schemaName: 'raw',
            tableName: 'orders',
          },
        },
      },
      {
        id: 'warehouse_payments',
        name: 'warehouse_payments',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['source'],
        metadata: {
          sourceMetricEvidence: sourceMetricEvidence(9_600),
          columns: [
            { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
            { name: 'amount', type: 'numeric', nullable: false },
          ],
          dbt: {
            packageName: 'analytics',
            sourceName: 'warehouse',
            schemaName: 'warehouse_raw',
            tableName: 'payments',
          },
        },
      },
      {
        id: 'orders_model',
        name: 'orders_model',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['model'],
        metadata: {
          dbt: {
            packageName: 'analytics',
            materialized: 'view',
            selectedSourceId: authoringGenerated ? 'raw_orders' : '',
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_raw_orders_model',
        sourceId: 'raw_orders',
        targetId: 'orders_model',
        relation: 'lineage',
      },
      {
        id: 'edge_warehouse_payments_model',
        sourceId: 'warehouse_payments',
        targetId: 'orders_model',
        relation: 'lineage',
      },
    ],
  });
}
