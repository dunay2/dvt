import {
  buildProtectedDraftRecord,
  buildWorkspaceGraphAuthoringDraft,
} from '../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../../src/app/services/workspace/workspaceGraphDraftProtocol';
import {
  buildDraftReadOkResponse,
  buildDraftSaveSavedResponse,
} from '../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';

import { stubE2eApi } from './e2eApiStub';
import { E2E_WORKSPACE_SESSION } from './workspaceSession';

export type CanvasDraftSessionScope = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

export type StubCanvasDraftReadOptions = {
  includeLooseNode?: boolean;
  canvasKind?: 'transformation' | 'dbt';
  emptyCanvas?: boolean;
  title?: string;
  readOnly?: boolean;
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
  emptyCanvas = false,
  title,
}: StubCanvasDraftReadOptions = {}): CanvasAuthoringDraft {
  const canvas = {
    kind: canvasKind,
    title: title ?? (canvasKind === 'dbt' ? 'dbt canvas' : 'Sales canvas'),
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

  if (canvasKind !== 'transformation') {
    throw new Error(
      'Canvas e2e draft fixtures only support non-empty transformation canvases or empty typed canvases.'
    );
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
        kind: 'sql_transform',
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
              kind: 'sql_transform',
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
    draft: buildCanvasAuthoringDraft(args),
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
