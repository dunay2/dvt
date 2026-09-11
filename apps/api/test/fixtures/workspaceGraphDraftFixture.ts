import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphDraftSaveRequest,
} from '@dvt/contracts';

import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../../src/application/ports/workspaceGraphDraft.js';

export const TEST_WORKSPACE_SCOPE = {
  tenantId: 'tenant-api-it',
  projectId: 'project-api-it',
  environmentId: 'env-api-it',
} as const;

const SQL_SHA = '2222222222222222222222222222222222222222222222222222222222222222';
const SUBSTRAIT_PLAN_SHA = '69252aee277c67b76620f3113ed17230f89d41c5a752ead85afce305be765203';
const SUBSTRAIT_PLAN_BASE64 =
  'GnQScgpaOlgKCRIFCgMDAQIoAhJBCj8KAigBEiwKBG5hbWUKBWVtYWlsCgdjb3VudHJ5EhQKBGICEAEKBGICEAEKBGICEAEYAjoLCgljdXN0b21lcnMaCBIGCgISACIAEgRuYW1lEgVlbWFpbBIHY291bnRyeTIXEGUqE2R2dC12dHgyLWNhcmQtcGlsb3Q=';

export function buildWorkspaceGraphDraft(
  overrides: Partial<WorkspaceGraphAuthoringDraft> = {}
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      kind: 'transformation',
      title: 'Main canvas',
    },
    nodeIds: ['source_1', 'transform_1', 'sink_1'],
    nodePositions: {
      source_1: { x: 0, y: 0 },
      transform_1: { x: 240, y: 0 },
      sink_1: { x: 480, y: 0 },
    },
    nodes: [
      {
        id: 'source_1',
        name: 'Orders source',
        pluginId: 'dbt',
        kind: 'postgres_table',
        role: 'input',
        status: 'idle',
        tags: ['orders'],
        metadata: {
          schema: 'raw',
          table: 'orders',
        },
      },
      {
        id: 'transform_1',
        name: 'Orders transform',
        pluginId: 'dbt',
        kind: 'sql_transform',
        role: 'transform',
        status: 'idle',
        tags: ['orders'],
        path: 'models/orders.sql',
        metadata: {
          dialect: 'postgres',
          sqlArtifact: {
            repo: 'github.com/dunay2/dvt',
            path: 'models/orders.sql',
            ref: 'refs/heads/main',
            commitSha: 'commit-sql-1',
            contentSha256: SQL_SHA,
          },
        },
      },
      {
        id: 'sink_1',
        name: 'Orders final',
        pluginId: 'dbt',
        kind: 'postgres_table',
        role: 'output',
        status: 'idle',
        tags: ['orders'],
        metadata: {
          schema: 'analytics',
          table: 'orders_final',
        },
      },
    ],
    edges: [
      {
        id: 'edge_source_transform',
        sourceId: 'source_1',
        targetId: 'transform_1',
        relation: 'lineage',
      },
      {
        id: 'edge_transform_sink',
        sourceId: 'transform_1',
        targetId: 'sink_1',
        relation: 'lineage',
      },
    ],
    ...overrides,
  };
}

export function buildWorkspaceGraphDraftSaveRequest(
  overrides: Partial<WorkspaceGraphDraftSaveRequest> = {}
): WorkspaceGraphDraftSaveRequest {
  const draft = buildWorkspaceGraphDraft();
  return {
    scope: TEST_WORKSPACE_SCOPE,
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    expectedRevision: WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
    idempotencyKey: 'draft-save-1',
    draft,
    ...overrides,
  };
}

export function buildCanonicalSemanticWorkspaceGraphDraft(): WorkspaceGraphAuthoringDraft {
  const draft = buildWorkspaceGraphDraft();
  return {
    ...draft,
    canvas: { id: 'canonical-canvas', kind: 'transformation', title: 'Canonical canvas' },
    nodes: draft.nodes.map((node) =>
      node.id === 'transform_1'
        ? {
            ...node,
            pluginId: 'dvt',
            kind: 'dvt:transform',
            metadata: {
              transformAuthoring: {
                version: 'v1',
                mode: 'substrait',
                semanticDocument: buildCanonicalSemanticDocument(),
              },
            },
          }
        : node
    ),
  };
}

export function buildDvtTerminalTransformPreviewDraft(): WorkspaceGraphAuthoringDraft {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'local-postgres-proof',
    provider: 'postgres',
  } as const;
  const connectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef,
    sourceObjectId: 'raw.orders',
  } as const;
  const semanticDocument = {
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan: {
      encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
      bytesBase64:
        'GkUSQwo3OjUKBxIDCgEAKAISKgooCgIoARITCghvcmRlcl9pZBIHCgO6AgAYAjoNCgNyYXcKBm9yZGVycxIIb3JkZXJfaWQyJxBlKiNkdnQtdnR4Mi1jb25uZWN0ZWQtZmllbGQtcHJvamVjdGlvbg==',
      sha256: '08a7b347a2d2f5cc35301db36e65d8cbe01601f6b4bebe3053110abfffd89b5e',
    },
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: '08a7b347a2d2f5cc35301db36e65d8cbe01601f6b4bebe3053110abfffd89b5e',
      relations: [
        {
          relationId: 'dvt_rel_01a08eae-fa06-7c41-97fc-a19ddd0226c1',
          relAnchor: 1,
          sourceRef: connectedSourceRef,
          displayName: 'orders',
        },
        {
          relationId: 'dvt_rel_01a08eae-fa06-7c9e-bb75-180ec3ec28f8',
          relAnchor: 2,
        },
      ],
      fields: [
        {
          fieldId: 'dvt_fld_01a08eae-fa06-7583-9bc6-a764e0223536',
          relationId: 'dvt_rel_01a08eae-fa06-7c41-97fc-a19ddd0226c1',
          outputOrdinal: 0,
          displayName: 'order_id',
        },
        {
          fieldId: 'dvt_fld_01a08eae-fa06-7c84-8a9e-2f5b90c1d743',
          relationId: 'dvt_rel_01a08eae-fa06-7c9e-bb75-180ec3ec28f8',
          sourceFieldId: 'dvt_fld_01a08eae-fa06-7583-9bc6-a764e0223536',
          outputOrdinal: 0,
          displayName: 'order_id',
        },
      ],
    },
  } satisfies DvtSubstraitSemanticDocumentV1;

  return {
    canvas: {
      id: 'dvt-terminal-preview-canvas',
      kind: 'transformation',
      title: 'Terminal Transform Preview',
    },
    nodeIds: ['source-orders', 'transform-orders'],
    nodePositions: {
      'source-orders': { x: 0, y: 0 },
      'transform-orders': { x: 240, y: 0 },
    },
    nodes: [
      {
        id: 'source-orders',
        name: 'Orders',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: ['source'],
        metadata: {
          schema: 'raw',
          tableName: 'orders',
          connectedSourceRef,
          columns: [{ name: 'order_id', type: 'integer' }],
        },
      },
      {
        id: 'transform-orders',
        name: 'Orders projection',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
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
        id: 'source-transform',
        sourceId: 'source-orders',
        targetId: 'transform-orders',
        relation: 'lineage',
      },
    ],
  };
}

export function buildCanonicalSemanticDocument(): DvtSubstraitSemanticDocumentV1 {
  return {
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan: {
      encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
      bytesBase64: SUBSTRAIT_PLAN_BASE64,
      sha256: SUBSTRAIT_PLAN_SHA,
    },
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: SUBSTRAIT_PLAN_SHA,
      relations: [
        { relationId: 'relation:source-node', relAnchor: 1 },
        { relationId: 'relation:transform-node:project', relAnchor: 2 },
      ],
      fields: ['name', 'email', 'country'].map((name, outputOrdinal) => ({
        fieldId: `field:transform-node:${name}`,
        relationId: 'relation:transform-node:project',
        outputOrdinal,
        displayName: name,
      })),
    },
  };
}
