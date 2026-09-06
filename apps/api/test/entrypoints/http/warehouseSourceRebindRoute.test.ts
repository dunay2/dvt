import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { WarehouseSourceRebindSchemaDriftError } from '../../../src/application/ports/warehouseSourceRebind.js';
import { registerWarehouseSourceRebindRoute } from '../../../src/entrypoints/http/warehouseSourceRebindRoute.js';

const QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';
const REQUEST = {
  schemaVersion: 'source-rebind-request.v1' as const,
  connectionId: 'warehouse-dr',
  sourceObjectId: 'relation/analytics/erp/orders_v2',
  idempotencyKey: 'source-rebind-http-test',
};
const RESULT = {
  schemaVersion: 'source-rebind-result.v1' as const,
  nodeId: 'dvt_src_01991dc0-0000-7000-8000-000000000401',
  draftRevision: 'source-rebind-revision',
  connectedSourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-dr',
      provider: 'postgres' as const,
    },
    sourceObjectId: REQUEST.sourceObjectId,
  },
};

type RebindRouteFixture = Readonly<{
  app: FastifyInstance;
  authorize: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
}>;

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

function buildApp(
  options: {
    authenticated?: boolean;
    authorized?: boolean;
    execute?: ReturnType<typeof vi.fn>;
  } = {}
): RebindRouteFixture {
  const app = Fastify({ logger: false });
  const execute = options.execute ?? vi.fn().mockResolvedValue(RESULT);
  const authorize = vi.fn().mockResolvedValue(
    options.authorized === false
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: { kind: 'command', name: 'workspace:source-import:rebind' },
            requestId: 'req-1',
            authorizedAt: new Date('2026-09-06T08:00:00Z'),
          },
        }
  );

  registerWarehouseSourceRebindRoute(app, {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue(
        options.authenticated === false
          ? { ok: false, code: 'missing_token' }
          : { ok: true, principal: principal() }
      ),
    } as never,
    authorizer: { authorize } as never,
    rebindSourceUseCase: { execute } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return { app, authorize, execute };
}

describe('warehouseSourceRebindRoute', () => {
  it('executes the dedicated protected rebind command with logical node identity intact', async () => {
    const { app, authorize, execute } = buildApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspace/sources/${RESULT.nodeId}/binding?${QUERY}`,
      payload: REQUEST,
      headers: { authorization: 'Bearer token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(RESULT);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      nodeId: RESULT.nodeId,
      ...REQUEST,
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-import:rebind' },
      }),
      expect.any(String)
    );
  });

  it('translates incompatible target schema into a fail-closed 422', async () => {
    const execute = vi.fn().mockRejectedValue(new WarehouseSourceRebindSchemaDriftError());
    const { app } = buildApp({ execute });

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspace/sources/${RESULT.nodeId}/binding?${QUERY}`,
      payload: REQUEST,
      headers: { authorization: 'Bearer token' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { type: 'unprocessable_entity', reason: 'warehouse_source_rebind_schema_drift' },
    });
  });

  it('rejects missing authentication before rebind side effects', async () => {
    const { app, execute } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'PATCH',
      url: `/workspace/sources/${RESULT.nodeId}/binding?${QUERY}`,
      payload: REQUEST,
    });

    expect(response.statusCode).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });
});
