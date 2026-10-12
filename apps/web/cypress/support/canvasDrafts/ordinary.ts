/**
 * Owned concern: construct the ordinary source-transform-sink and loose-node scenarios.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';

export function buildOrdinaryDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  { includeLooseNode = false }: Pick<CanvasDraftScenarioOptions, 'includeLooseNode'>
): CanvasAuthoringDraft {
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      src_orders: { x: 40, y: 140 },
      model_orders: { x: 320, y: 140 },
      orders_dashboard: { x: 620, y: 140 },
      ...(includeLooseNode
        ? {
            orphan_metrics: { x: 320, y: 360 },
          }
        : {}),
    },
    nodes: [
      {
        id: 'src_orders',
        name: 'src_orders',
        pluginId: 'dvt',
        kind: 'source',
        role: 'input',
        status: 'idle',
        tags: ['source'],
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          },
        },
      },
      {
        id: 'model_orders',
        name: 'model_orders',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: ['transform'],
        path: 'models/analytics/model_orders.sql',
        metadata: {
          config: {
            dialect: 'postgres',
          },
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: 'models/analytics/model_orders.sql',
            ref: 'refs/heads/main',
            commitSha: 'local',
            contentSha256: 'a'.repeat(64),
          },
        },
      },
      {
        id: 'orders_dashboard',
        name: 'orders_dashboard',
        pluginId: 'dvt',
        kind: 'sink',
        role: 'output',
        status: 'idle',
        tags: ['output'],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
      ...(includeLooseNode
        ? [
            {
              id: 'orphan_metrics',
              name: 'orphan_metrics',
              pluginId: 'dvt',
              kind: 'transform',
              role: 'transform' as const,
              status: 'idle' as const,
              tags: ['loose'],
              path: 'models/analytics/orphan_metrics.sql',
              metadata: {
                config: {
                  dialect: 'postgres',
                },
                sqlArtifact: {
                  repo: 'dunay2/dvt',
                  path: 'models/analytics/orphan_metrics.sql',
                  ref: 'refs/heads/main',
                  commitSha: 'local',
                  contentSha256: 'b'.repeat(64),
                },
              },
            },
          ]
        : []),
    ],
    edges: [
      {
        id: 'edge_source_transform',
        sourceId: 'src_orders',
        targetId: 'model_orders',
        relation: 'lineage',
      },
      {
        id: 'edge_transform_sink',
        sourceId: 'model_orders',
        targetId: 'orders_dashboard',
        relation: 'lineage',
      },
    ],
  });
}
