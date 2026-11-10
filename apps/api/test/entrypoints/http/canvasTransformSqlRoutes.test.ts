import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../src/application/ports/accessDecision.js';
import { CanvasTransformProjectionUnavailableError } from '../../../src/application/ports/canvasTransformSql.js';
import { registerCanvasTransformSqlRoutes } from '../../../src/entrypoints/http/canvasTransformSqlRoutes.js';

const scope = 'tenantId=tenant&projectId=project&environmentId=dev';
const digest = 'a'.repeat(64);
const url = `/workspace/graph/canvases/canvas/transforms/model/sql?${scope}&semanticPlanSha256=${digest}`;
const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function buildApp(
  authenticated = true,
  allowed = true
): Readonly<{
  app: FastifyInstance;
  execute: ReturnType<typeof vi.fn>;
  authorize: ReturnType<typeof vi.fn>;
}> {
  const principal = {
    principalId: 'user',
    subjectId: 'user',
    issuer: 'test',
    audience: 'test',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant'],
    assertedProjectIds: ['project'],
  };
  const execute = vi.fn(async () => ({
    schemaVersion: 'canvas-transform-sql-projection.v1',
    canvasId: 'canvas',
    transformNodeId: 'model',
    semanticPlanSha256: digest,
    draftRevision: 'revision',
    sql: 'select client_id from raw.client',
    provenance: {
      sourceRefs: [],
      modelRefs: [
        {
          canvasId: 'files',
          uniqueId: 'model.demo.client',
          contentSetSha256: 'b'.repeat(64),
          analysisSha256: 'c'.repeat(64),
        },
      ],
    },
  }));
  const authorize = vi.fn(async (_principal, requestedScope) =>
    allowed
      ? {
          ok: true,
          context: {
            principal,
            scope: requestedScope,
            action: requestedScope.action,
            requestId: 'request',
            authorizedAt: new Date('2026-11-08T00:00:00Z'),
          },
        }
      : { ok: false, reason: 'tenant_access_denied' }
  );
  const authenticateBearerToken = vi.fn(async () =>
    authenticated ? { ok: true, principal } : { ok: false, code: 'MISSING_TOKEN' }
  );
  const app = Fastify({ logger: false });
  apps.push(app);
  registerCanvasTransformSqlRoutes(app, {
    authenticator: { authenticateBearerToken } as never,
    authorizer: { authorize } as never,
    query: { execute } as never,
    rateLimit: { max: 100, timeWindow: 60000 },
  });
  return { app, execute, authorize };
}

describe('protected Transform SQL HTTP query', () => {
  it('passes only scoped identities and the expected revision to the query', async () => {
    const { app, execute, authorize } = buildApp();
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledWith(
      { canvasId: 'canvas', transformNodeId: 'model', semanticPlanSha256: digest },
      expect.anything()
    );
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: AUTHORIZATION_ACTION.workspaceGraphDraftView }),
      expect.any(String)
    );
    expect(response.json()).not.toHaveProperty('rows');
  });

  it.each([
    url.replace(`&semanticPlanSha256=${digest}`, ''),
    url.replace(digest, 'bad'),
    url.replace('projectId=project', 'projectId='),
    url + '&sql=select%201',
  ])('rejects malformed identity or executable input before dispatch: %s', async (target) => {
    const { app, execute, authorize } = buildApp();
    const response = await app.inject({ method: 'GET', url: target });
    expect(response.statusCode).toBe(400);
    expect(execute).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });

  it.each([
    [false, true, 401],
    [true, false, 403],
  ] as const)('enforces session %s and scope grant %s', async (authenticated, allowed, status) => {
    const { app, execute } = buildApp(authenticated, allowed);
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(status);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ['canvas_changed', 409, 'transform_sql_projection_stale'],
    ['projection_unsupported', 422, 'transform_sql_projection_failed'],
    ['file_access_denied', 403, 'transform_sql_projection_access_denied'],
  ] as const)(
    'publishes %s as a bounded reason without diagnostic SQL',
    async (reason, status, wireReason) => {
      const { app, execute } = buildApp();
      execute.mockRejectedValue(new CanvasTransformProjectionUnavailableError(reason));
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(status);
      expect(response.json()).toEqual({
        error: {
          type: status === 409 ? 'conflict' : status === 403 ? 'forbidden' : 'unprocessable_entity',
          reason: wireReason,
        },
      });
    }
  );
});
