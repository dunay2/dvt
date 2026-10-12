/**
 * Owned concern: construct generated Substrait projection and terminal preview scenarios.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';

import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';

export function buildGeneratedDraft(
  canvas: CanvasAuthoringDraft['canvas'],
  {
    includeLooseNode = false,
    terminalTransformPreview = false,
    sourceDatabaseName = 'dvt',
    terminalTransformResultTarget,
  }: Pick<
    CanvasDraftScenarioOptions,
    | 'includeLooseNode'
    | 'terminalTransformPreview'
    | 'sourceDatabaseName'
    | 'terminalTransformResultTarget'
  >
): CanvasAuthoringDraft {
  const usesProofSource = terminalTransformPreview || sourceDatabaseName !== 'dvt';
  const connectionId = usesProofSource ? 'local-postgres-proof' : 'warehouse-a';
  const connectionRef = {
    schemaVersion: 'connection-ref.v1' as const,
    provider: 'postgres' as const,
    connectionId,
  };
  const sourceRef = {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef,
    sourceObjectId: usesProofSource ? `relation/${sourceDatabaseName}/raw/orders` : 'raw.orders',
  };
  const fields = terminalTransformPreview
    ? [{ name: 'customer', dataType: 'string' }]
    : [
        { name: 'order_id', dataType: 'integer' },
        { name: 'total', dataType: 'decimal' },
      ];
  const semanticDocument = encodeDvtSubstraitProjectionDocument(
    createDvtSubstraitProjectionDraft({
      source: {
        nodeId: 'source-1',
        schema: 'raw',
        table: 'orders',
        sourceRef,
        fields,
      },
      targetNodeId: 'dvt-transform-1',
      outputs: fields.map(({ name }) => ({
        fieldId: `output:${name}`,
        name,
        sourceFieldName: name,
      })),
    })
  );
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      'source-1': { x: 40, y: 140 },
      'dvt-transform-1': { x: 340, y: 140 },
      ...(terminalTransformPreview ? {} : { 'sink-1': { x: 650, y: 140 } }),
      ...(includeLooseNode
        ? {
            'orphan-transform-1': { x: 340, y: 360 },
          }
        : {}),
    },
    nodes: [
      {
        id: 'source-1',
        name: 'Source 1',
        pluginId: usesProofSource ? 'dvt.warehouse-source' : 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          typeLabel: 'Source',
          schema: 'raw',
          tableName: 'orders',
          connectedSourceRef: sourceRef,
          columns: fields.map(({ name, dataType }) => ({
            name,
            type: dataType === 'string' ? 'text' : dataType,
            nullable: false,
          })),
          config: {
            database: 'legacy_warehouse',
            schema: 'raw',
            table: 'orders',
            alias: 'orders_source',
          },
        },
      },
      {
        id: 'dvt-transform-1',
        name: 'Transform 1',
        pluginId: 'dvt',
        kind: terminalTransformPreview ? 'transform' : 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {
          typeLabel: 'Transform',
          ...(terminalTransformResultTarget === undefined
            ? {}
            : {
                config: {
                  materialized: 'table',
                  resultTarget: {
                    schemaVersion: 'dvt-transform-result-target.v1',
                    connectionRef,
                    ...terminalTransformResultTarget,
                  },
                },
              }),
          transformAuthoring: {
            version: 'v1',
            mode: 'substrait',
            semanticDocument,
          },
        },
      },
      ...(terminalTransformPreview
        ? []
        : [
            {
              id: 'sink-1',
              name: 'Sink 1',
              pluginId: 'dvt',
              kind: 'dvt:sink',
              role: 'output' as const,
              status: 'idle' as const,
              tags: ['authoring'],
              metadata: {
                typeLabel: 'Sink',
                config: {
                  database: 'legacy_warehouse',
                  schema: 'marts',
                  table: 'orders_daily',
                  materialization: 'table',
                  writeMode: 'replace',
                  partitionStrategy: 'daily_by_order_date',
                },
              },
            },
          ]),
      ...(includeLooseNode
        ? [
            {
              id: 'orphan-transform-1',
              name: 'Orphan transform',
              pluginId: 'dvt',
              kind: 'dvt:transform',
              role: 'transform' as const,
              status: 'idle' as const,
              tags: ['authoring', 'loose'],
              metadata: { typeLabel: 'Transform' },
            },
          ]
        : []),
    ],
    edges: [
      {
        id: 'edge-source-transform',
        sourceId: 'source-1',
        targetId: 'dvt-transform-1',
        relation: 'lineage',
      },
      ...(terminalTransformPreview
        ? []
        : [
            {
              id: 'edge-transform-sink',
              sourceId: 'dvt-transform-1',
              targetId: 'sink-1',
              relation: 'lineage' as const,
            },
          ]),
    ],
  });
}
