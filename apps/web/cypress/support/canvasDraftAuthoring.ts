import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  type SourceObjectMetricEvidence,
} from '@dvt/contracts';

import {
  buildLargeWorkspaceGraphAuthoringDraft,
  buildProtectedDraftRecord,
  buildWorkspaceGraphAuthoringDraft,
} from '../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import {
  buildDraftReadOkResponse,
  buildDraftSaveSavedResponse,
} from '../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import type { CanonicalNode } from '../../src/app/types/canonical';
import {
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from '../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
} from '../../src/app/views/canvas/canvasDvtSubstraitPilot';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from '../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { normalizeProjectCanvasDraft } from '../../src/app/views/canvas/canvasProjectCanvasLifecycle';

import { stubE2eApi } from './e2eApiStub';
import { E2E_WORKSPACE_SESSION } from './workspaceSession';

export type CanvasDraftSessionScope = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

export type StubCanvasDraftReadOptions = {
  includeLooseNode?: boolean;
  canvasKind?: 'transformation';
  dbtGraph?: boolean;
  emptyCanvas?: boolean;
  importedWarehouseSource?: boolean;
  authoringGenerated?: boolean;
  columnMapping?: boolean;
  columnMappingDisconnected?: boolean;
  substraitInnerJoin?: boolean;
  substraitNInputJoin?: boolean;
  substraitUnionAll?: boolean;
  substraitPilot?: boolean;
  title?: string;
  readOnly?: boolean;
  largeGraph?: boolean;
};

type CanvasAuthoringDraft = ReturnType<typeof buildWorkspaceGraphAuthoringDraft>;
type CanvasDraftReadResponse = ReturnType<typeof buildDraftReadOkResponse>;
type CanvasDraftSaveRequest = {
  scope: CanvasDraftSessionScope;
  schemaVersion: typeof WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION;
  expectedRevision: string;
  idempotencyKey: string;
  draft: CanvasAuthoringDraft;
};

export function buildCanvasAuthoringDraft({
  includeLooseNode = false,
  canvasKind = 'transformation',
  dbtGraph = false,
  emptyCanvas = false,
  importedWarehouseSource = false,
  authoringGenerated = false,
  columnMapping = false,
  columnMappingDisconnected = false,
  substraitInnerJoin = false,
  substraitNInputJoin = false,
  substraitUnionAll = false,
  substraitPilot = false,
  title,
  largeGraph = false,
}: StubCanvasDraftReadOptions = {}): CanvasAuthoringDraft {
  if (largeGraph) {
    return buildLargeWorkspaceGraphAuthoringDraft();
  }

  const canvas = {
    id: 'main-canvas',
    kind: canvasKind,
    title: title ?? (dbtGraph ? 'dbt graph' : 'Sales canvas'),
  };

  if (emptyCanvas) {
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    });
  }

  if (substraitUnionAll) {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-a',
      provider: 'postgres' as const,
    };
    const fields = ['customer_id', 'name', 'country'];
    const source = (id: string, table: string): CanonicalNode => ({
      id,
      name: table,
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input' as const,
      status: 'idle' as const,
      tags: ['source'],
      metadata: {
        sourceName: table,
        schema: 'public',
        tableName: table,
        columns: fields.map((name) => ({ name, type: 'string' })),
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef,
          sourceObjectId: `public.${table}`,
        },
      },
    });
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: ['source-customers-north', 'source-customers-south', 'union-transform'],
      nodePositions: {
        'source-customers-north': { x: 40, y: 100 },
        'source-customers-south': { x: 40, y: 340 },
        'union-transform': { x: 420, y: 220 },
      },
      nodes: [
        source('source-customers-north', 'customers_north'),
        source('source-customers-south', 'customers_south'),
        {
          id: 'union-transform',
          name: 'All customers',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: ['authoring'],
          metadata: {},
        },
      ],
      edges: [
        {
          id: 'north-union',
          sourceId: 'source-customers-north',
          targetId: 'union-transform',
          relation: 'lineage',
        },
        {
          id: 'south-union',
          sourceId: 'source-customers-south',
          targetId: 'union-transform',
          relation: 'lineage',
        },
      ],
    });
  }

  if (substraitInnerJoin || substraitNInputJoin) {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-a',
      provider: 'postgres' as const,
    };
    const semanticDocument = encodeDvtSubstraitInnerJoinDocument(
      createDvtSubstraitInnerJoinDraft({
        left: {
          nodeId: 'source-customers',
          schema: 'public',
          table: 'customers',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers',
          },
        },
        right: {
          nodeId: 'source-orders',
          schema: 'public',
          table: 'orders',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.orders',
          },
        },
        targetNodeId: 'join-transform',
      })
    );
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: [
        'source-customers',
        'source-orders',
        ...(substraitNInputJoin ? ['source-shipments', 'source-tickets'] : []),
        'join-transform',
      ],
      nodePositions: {
        'source-customers': { x: 40, y: 100 },
        'source-orders': { x: 40, y: 340 },
        ...(substraitNInputJoin
          ? {
              'source-shipments': { x: 40, y: 580 },
              'source-tickets': { x: 40, y: 820 },
            }
          : {}),
        'join-transform': { x: 420, y: 220 },
      },
      nodes: [
        {
          id: 'source-customers',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            schema: 'public',
            tableName: 'customers',
            columns: [
              { name: 'customer_id', type: 'string' },
              { name: 'name', type: 'string' },
            ],
            connectedSourceRef: {
              schemaVersion: 'connected-source-ref.v1',
              connectionRef,
              sourceObjectId: 'public.customers',
            },
          },
        },
        {
          id: 'source-orders',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            schema: 'public',
            tableName: 'orders',
            columns: [
              { name: 'order_id', type: 'string' },
              { name: 'customer_id', type: 'string' },
            ],
            connectedSourceRef: {
              schemaVersion: 'connected-source-ref.v1',
              connectionRef,
              sourceObjectId: 'public.orders',
            },
          },
        },
        ...(substraitNInputJoin
          ? [
              {
                id: 'source-shipments',
                name: 'shipments',
                pluginId: 'dvt',
                kind: 'dvt:source',
                role: 'input' as const,
                status: 'idle' as const,
                tags: ['authoring'],
                metadata: {
                  schema: 'public',
                  tableName: 'shipments',
                  columns: [
                    { name: 'shipment_id', type: 'string' },
                    { name: 'customer_id', type: 'string' },
                  ],
                  connectedSourceRef: {
                    schemaVersion: 'connected-source-ref.v1' as const,
                    connectionRef,
                    sourceObjectId: 'public.shipments',
                  },
                },
              },
              {
                id: 'source-tickets',
                name: 'tickets',
                pluginId: 'dvt',
                kind: 'dvt:source',
                role: 'input' as const,
                status: 'idle' as const,
                tags: ['authoring'],
                metadata: {
                  schema: 'public',
                  tableName: 'tickets',
                  columns: [
                    { name: 'ticket_id', type: 'string' },
                    { name: 'customer_id', type: 'string' },
                  ],
                  connectedSourceRef: {
                    schemaVersion: 'connected-source-ref.v1' as const,
                    connectionRef,
                    sourceObjectId: 'public.tickets',
                  },
                },
              },
            ]
          : []),
        {
          id: 'join-transform',
          name: 'Customer orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            transformAuthoring: {
              version: 'v1',
              mode: 'substrait',
              semanticDocument,
            },
          },
        },
      ],
      edges: [
        {
          id: 'customers-join',
          sourceId: 'source-customers',
          targetId: 'join-transform',
          relation: 'lineage',
        },
        {
          id: 'orders-join',
          sourceId: 'source-orders',
          targetId: 'join-transform',
          relation: 'lineage',
        },
        ...(substraitNInputJoin
          ? [
              {
                id: 'shipments-join',
                sourceId: 'source-shipments',
                targetId: 'join-transform',
                relation: 'lineage' as const,
              },
              {
                id: 'tickets-join',
                sourceId: 'source-tickets',
                targetId: 'join-transform',
                relation: 'lineage' as const,
              },
            ]
          : []),
      ],
    });
  }

  if (substraitPilot) {
    const semanticDocument = encodeDvtSubstraitPilotDocument(
      createDvtSubstraitPilotDraft({
        sourceNodeId: 'source-customers',
        targetNodeId: 'transform-customers',
      })
    );
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: ['source-customers', 'transform-customers'],
      nodePositions: {
        'source-customers': { x: 40, y: 160 },
        'transform-customers': { x: 420, y: 160 },
      },
      nodes: [
        {
          id: 'source-customers',
          name: 'customers',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            config: { schema: 'public', table: 'customers', alias: 'customers' },
            columns: [
              { name: 'name', type: 'string' },
              { name: 'email', type: 'string' },
              { name: 'country', type: 'string' },
            ],
          },
        },
        {
          id: 'transform-customers',
          name: 'Customer summary',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            transformAuthoring: {
              version: 'v1',
              mode: 'substrait',
              semanticDocument,
            },
          },
        },
      ],
      edges: [
        {
          id: 'customers-transform',
          sourceId: 'source-customers',
          targetId: 'transform-customers',
          relation: 'lineage',
        },
      ],
    });
  }

  if (dbtGraph && importedWarehouseSource) {
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: ['src_erp_orders'],
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

  if (dbtGraph) {
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
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: ['raw_orders', 'warehouse_payments', 'orders_model'],
      nodePositions: {
        raw_orders: { x: 40, y: 120 },
        warehouse_payments: { x: 40, y: 320 },
        orders_model: { x: 360, y: 220 },
      },
      nodes: [
        {
          id: 'raw_orders',
          name: 'raw_orders',
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

  if (canvasKind !== 'transformation') {
    throw new Error(
      'Canvas e2e draft fixtures only support non-empty transformation canvases or empty typed canvases.'
    );
  }

  if (columnMapping) {
    const columns = [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'numeric' },
      { name: 'status', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'region', type: 'text' },
    ];
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: ['source-orders', 'model-orders', 'sink-orders'],
      nodePositions: {
        'source-orders': { x: 40, y: 140 },
        'model-orders': { x: 620, y: 140 },
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
        {
          id: 'edge-model-sink',
          sourceId: 'model-orders',
          targetId: 'sink-orders',
          relation: 'lineage',
        },
      ],
    });
  }

  if (authoringGenerated) {
    const semanticDocument = encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source: {
          nodeId: 'source-1',
          schema: 'raw',
          table: 'orders',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              provider: 'postgres',
              connectionId: 'warehouse-a',
            },
            sourceObjectId: 'raw.orders',
          },
          fields: [
            { name: 'order_id', dataType: 'integer' },
            { name: 'total', dataType: 'decimal' },
          ],
        },
        targetNodeId: 'dvt-transform-1',
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:total', name: 'total', sourceFieldName: 'total' },
        ],
      })
    );
    return buildWorkspaceGraphAuthoringDraft({
      canvas,
      nodeIds: [
        'source-1',
        'dvt-transform-1',
        'sink-1',
        ...(includeLooseNode ? ['orphan-transform-1'] : []),
      ],
      nodePositions: {
        'source-1': { x: 40, y: 140 },
        'dvt-transform-1': { x: 340, y: 140 },
        'sink-1': { x: 650, y: 140 },
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
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            typeLabel: 'Source',
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
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: ['authoring'],
          metadata: {
            typeLabel: 'Transform',
            transformAuthoring: {
              version: 'v1',
              mode: 'substrait',
              semanticDocument,
            },
          },
        },
        {
          id: 'sink-1',
          name: 'Sink 1',
          pluginId: 'dvt',
          kind: 'dvt:sink',
          role: 'output',
          status: 'idle',
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
        {
          id: 'edge-transform-sink',
          sourceId: 'dvt-transform-1',
          targetId: 'sink-1',
          relation: 'lineage',
        },
      ],
    });
  }

  return buildWorkspaceGraphAuthoringDraft({
    canvas,
    nodeIds: [
      'src_orders',
      'model_orders',
      'orders_dashboard',
      ...(includeLooseNode ? ['orphan_metrics'] : []),
    ],
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

export function buildCanvasDraftReadResponse(
  scope: CanvasDraftSessionScope,
  options: StubCanvasDraftReadOptions = {}
): CanvasDraftReadResponse {
  const capability = options.readOnly
    ? {
        scope,
        mode: 'read_only' as const,
        canRead: true,
        canWrite: false,
        reason: 'write_denied' as const,
      }
    : undefined;

  return buildDraftReadOkResponse(scope, {
    ...(capability ? { capability } : {}),
    record: buildProtectedDraftRecord(scope, {
      revision: 'rev-e2e-graph-ready',
      scope,
      draft: buildCanvasAuthoringDraft(options),
    }),
  });
}

export function buildCanvasDraftSaveRequest(
  scope: CanvasDraftSessionScope,
  args: StubCanvasDraftReadOptions & {
    expectedRevision?: string;
    idempotencyKey?: string;
  } = {}
): CanvasDraftSaveRequest {
  return {
    scope,
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    expectedRevision: args.expectedRevision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
    idempotencyKey: args.idempotencyKey ?? 'canvas-draft-authoring-seed',
    draft: normalizeProjectCanvasDraft(buildCanvasAuthoringDraft(args)),
  };
}

export function stubCanvasDraftRead(
  options: StubCanvasDraftReadOptions = {},
  scope: CanvasDraftSessionScope = E2E_WORKSPACE_SESSION
): void {
  const responseBody = buildCanvasDraftReadResponse(scope, options);

  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: scope.tenantId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
    });

    return {
      statusCode: 200,
      body: responseBody,
    };
  });
}

export function stubCanvasDraftSave(scope: CanvasDraftSessionScope = E2E_WORKSPACE_SESSION): void {
  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    expect(body).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: 'rev-e2e-graph-ready',
    });
    expect((body as CanvasDraftSaveRequest).scope).to.deep.equal(scope);

    return {
      body: buildDraftSaveSavedResponse(scope, {
        revision: 'rev-e2e-graph-ready-2',
      }),
    };
  });
}

export function stubFailingCanvasDraftSave(
  scope: CanvasDraftSessionScope = E2E_WORKSPACE_SESSION
): void {
  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    expect(body).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: 'rev-e2e-graph-ready',
    });
    expect((body as CanvasDraftSaveRequest).scope).to.deep.equal(scope);

    return {
      statusCode: 500,
      body: {
        error: {
          type: 'internal_error',
          reason: 'draft_save_failed',
          message: 'Draft save failed in e2e fixture.',
        },
      },
    };
  });
}

export function stubStatefulCanvasDraftAuthoring(
  options: StubCanvasDraftReadOptions = {},
  scope: CanvasDraftSessionScope = E2E_WORKSPACE_SESSION
): void {
  let revision = 'rev-e2e-graph-ready';
  let draft = buildCanvasAuthoringDraft(options);

  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: scope.tenantId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
    });

    return {
      statusCode: 200,
      body: buildDraftReadOkResponse(scope, {
        record: buildProtectedDraftRecord(scope, {
          revision,
          scope,
          draft,
        }),
      }),
    };
  });

  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    const saveRequest = body as CanvasDraftSaveRequest;
    expect(saveRequest).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: revision,
    });
    expect(saveRequest.scope).to.deep.equal(scope);

    draft = saveRequest.draft;
    revision = `rev-e2e-graph-ready-${draft.nodeIds.join('-')}`;

    return {
      body: buildDraftSaveSavedResponse(scope, {
        revision,
      }),
    };
  });
}
