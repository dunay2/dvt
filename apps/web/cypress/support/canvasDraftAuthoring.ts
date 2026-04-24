import {
  buildDraftReadOkResponse,
  buildProtectedDraftRecord,
  buildWorkspaceGraphAuthoringDraft,
} from '../../src/app/services/workspace/workspaceGraphDraft.test.fixtures';
import { stubE2eApi } from './e2eApiStub';

import { E2E_WORKSPACE_SESSION } from './workspaceSession';

type StubCanvasDraftReadOptions = {
  includeLooseNode?: boolean;
};

function buildCanvasAuthoringDraft({ includeLooseNode = false }: StubCanvasDraftReadOptions = {}) {
  return buildWorkspaceGraphAuthoringDraft({
    canvas: {
      kind: 'transformation',
      title: 'Sales canvas',
    },
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

export function stubCanvasDraftRead(options: StubCanvasDraftReadOptions = {}): void {
  const responseBody = buildDraftReadOkResponse(E2E_WORKSPACE_SESSION, {
    record: buildProtectedDraftRecord(E2E_WORKSPACE_SESSION, {
      revision: 'rev-e2e-graph-ready',
      draft: buildCanvasAuthoringDraft(options),
    }),
  });

  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: E2E_WORKSPACE_SESSION.tenantId,
      projectId: E2E_WORKSPACE_SESSION.projectId,
      environmentId: E2E_WORKSPACE_SESSION.environmentId,
    });

    return {
      statusCode: 200,
      body: responseBody,
    };
  });
}
