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
