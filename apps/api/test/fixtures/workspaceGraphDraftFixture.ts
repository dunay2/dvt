import type { DesignGraphDraft, WorkspaceGraphDraftSaveRequest } from '@dvt/contracts';

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

export function buildWorkspaceGraphDraft(
  overrides: Partial<DesignGraphDraft> = {}
): DesignGraphDraft {
  return {
    context: {
      tenantId: TEST_WORKSPACE_SCOPE.tenantId,
      projectId: TEST_WORKSPACE_SCOPE.projectId,
      environmentId: TEST_WORKSPACE_SCOPE.environmentId,
      executionTarget: 'postgres',
      requestedBy: 'principal-api-it',
      ...(overrides.context ?? {}),
    },
    nodes: [
      {
        id: 'source_1',
        type: 'source',
        payload: {
          kind: 'postgres_table',
          schema: 'raw',
          table: 'orders',
          alias: 'orders_source',
        },
      },
      {
        id: 'transform_1',
        type: 'sql_transform',
        payload: {
          dialect: 'postgres',
          entrypoint: 'models/orders.sql',
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
        type: 'sink',
        payload: {
          kind: 'postgres_table',
          schema: 'analytics',
          table: 'orders_final',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    ],
    edges: [
      { fromNodeId: 'source_1', toNodeId: 'transform_1' },
      { fromNodeId: 'transform_1', toNodeId: 'sink_1' },
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
