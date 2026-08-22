import {
  type GraphDbtWorkspaceArtifactPublicationResult,
  type PublishGraphDbtWorkspaceArtifactsRequest,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceFileBatchIdempotencyConflictError } from '../../../src/application/ports/workspaceFiles.js';
import { registerGraphDbtWorkspaceArtifactPublicationRoutes } from '../../../src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';
const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

const SQL_PAYLOAD = 'select 1\n';

const REQUEST: PublishGraphDbtWorkspaceArtifactsRequest = {
  canvasId: 'orders-canvas',
  artifacts: [
    {
      path: 'dbt_project.yml',
      content: 'name: analytics\n',
      language: 'yaml',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
    {
      path: 'models/orders.sql',
      content: `-- dvt:graph-draft-content-sha256=${sha256HexUtf8(SQL_PAYLOAD)}\n${SQL_PAYLOAD}`,
      language: 'sql',
      expectedRevision: { kind: 'content_sha256', value: 'b'.repeat(64) },
      writeRequired: true,
    },
    {
      path: 'models/schema.yml',
      content: 'version: 2\n',
      language: 'yaml',
      expectedRevision: { kind: 'absent' },
      writeRequired: true,
    },
  ],
  idempotencyKey: 'graph-dbt:' + 'c'.repeat(64),
};

const APPLIED: GraphDbtWorkspaceArtifactPublicationResult = {
  schemaVersion: 'graph-dbt-workspace-artifact-publication.v1',
  kind: 'applied',
  idempotencyKey: REQUEST.idempotencyKey,
  requestHash: 'd'.repeat(64),
  deduplicated: false,
  writes: REQUEST.artifacts.map((artifact) => ({
    path: artifact.path,
    contentSha256: 'e'.repeat(64),
  })),
};

describe('graphDbtWorkspaceArtifactPublicationRoutes', () => {
  it('publishes one contract-valid artifact set with file-save authority', async () => {
    const { app, execute, authorize } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/publications?${SCOPE_QUERY}`,
      payload: REQUEST,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(APPLIED);
    expect(execute).toHaveBeenCalledWith({ scope: SCOPE, ...REQUEST });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:files:save' },
      }),
      expect.any(String)
    );
  });

  it('rejects an incomplete proposal before authentication or command execution', async () => {
    const { app, execute, authenticateBearerToken } = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/publications?${SCOPE_QUERY}`,
      payload: { ...REQUEST, artifacts: REQUEST.artifacts.slice(0, 2) },
    });

    expect(response.statusCode).toBe(400);
    expect(authenticateBearerToken).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not execute without a bearer token', async () => {
    const { app, execute } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/publications?${SCOPE_QUERY}`,
      payload: REQUEST,
    });

    expect(response.statusCode).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not execute without file-save authority', async () => {
    const { app, execute } = buildApp({ authorized: false });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/publications?${SCOPE_QUERY}`,
      payload: REQUEST,
    });

    expect(response.statusCode).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps idempotency-key reuse with different intent to an explicit conflict', async () => {
    const { app } = buildApp({
      execute: vi
        .fn()
        .mockRejectedValue(new WorkspaceFileBatchIdempotencyConflictError(REQUEST.idempotencyKey)),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/publications?${SCOPE_QUERY}`,
      payload: REQUEST,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        type: 'conflict',
        reason: 'graph_dbt_workspace_artifact_publication_idempotency_conflict',
      },
    });
  });
});

function buildApp(
  input: Readonly<{
    execute?: ReturnType<typeof vi.fn>;
    authenticated?: boolean;
    authorized?: boolean;
  }> = {}
): {
  app: ReturnType<typeof Fastify>;
  execute: ReturnType<typeof vi.fn>;
  authenticateBearerToken: ReturnType<typeof vi.fn>;
  authorize: ReturnType<typeof vi.fn>;
} {
  const app = Fastify({ logger: false });
  const execute = input.execute ?? vi.fn().mockResolvedValue(APPLIED);
  const authenticateBearerToken = vi
    .fn()
    .mockResolvedValue(
      input.authenticated === false
        ? { ok: false, code: 'missing_token' }
        : { ok: true, principal: principal() }
    );
  const authorize = vi.fn().mockImplementation((_principal, requestedScope) =>
    input.authorized === false
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-07-29T00:00:00Z'),
          },
        }
  );
  registerGraphDbtWorkspaceArtifactPublicationRoutes(app, {
    authenticator: { authenticateBearerToken } as never,
    authorizer: { authorize } as never,
    command: { execute } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return { app, execute, authenticateBearerToken, authorize };
}

function principal(): Record<string, unknown> {
  return {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}
