import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  type WorkspaceGraphDraftAuditRef,
} from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerWorkspaceGraphDraftRoutes } from '../../../src/entrypoints/http/workspaceGraphDraftRoutes.js';
import { buildWorkspaceGraphDraftSaveRequest } from '../../fixtures/workspaceGraphDraftFixture.js';

interface TestAppContext {
  readonly app: FastifyInstance;
  readonly authenticator: { readonly authenticateBearerToken: ReturnType<typeof vi.fn> };
  readonly capabilityService: {
    readonly authorize: ReturnType<typeof vi.fn>;
  };
  readonly getUseCase: {
    readonly execute: ReturnType<typeof vi.fn>;
  };
  readonly saveUseCase: {
    readonly execute: ReturnType<typeof vi.fn>;
  };
  readonly telemetry: {
    readonly recordRead: ReturnType<typeof vi.fn>;
    readonly recordWrite: ReturnType<typeof vi.fn>;
  };
}

const TEST_SCOPE = {
  tenantId: 'tenant-api-it',
  projectId: 'project-api-it',
  environmentId: 'env-api-it',
} as const;

const WRITABLE_CAPABILITY = {
  scope: TEST_SCOPE,
  mode: 'writable',
  canRead: true,
  canWrite: true,
  reason: 'authorized',
} as const;

function auditRef(
  action: 'draft_read' | 'draft_write',
  outcome: 'allowed' | 'conflict'
): WorkspaceGraphDraftAuditRef {
  return {
    correlationId: 'req-1',
    decisionId: 'dec-1',
    action,
    outcome,
    recordedAt: '2026-04-16T00:00:00.000Z',
  };
}

function createApp(options?: {
  readonly app?: FastifyInstance;
  readonly decision?: Record<string, unknown>;
  readonly readResult?: Record<string, unknown>;
  readonly rateLimit?: { readonly max: number; readonly timeWindow: number };
  readonly saveResult?: Record<string, unknown>;
}): TestAppContext {
  const app = options?.app ?? Fastify({ logger: false });
  const capabilityService = {
    authorize: vi.fn(async () => ({
      authentication: 'authenticated',
      requestId: 'req-1',
      correlationId: 'req-1',
      decisionId: 'dec-1',
      recordedAt: '2026-04-16T00:00:00.000Z',
      requestedScope: {
        tenantId: { value: 'tenant-api-it' },
        projectId: { value: 'project-api-it' },
        environmentId: { value: 'env-api-it' },
      },
      scope: TEST_SCOPE,
      capability: WRITABLE_CAPABILITY,
      ...(options?.decision ?? {}),
    })),
  };
  const getUseCase = {
    execute: vi.fn(
      async () =>
        options?.readResult ?? {
          kind: 'response',
          httpStatus: 404,
          response: {
            kind: 'not_found',
            capability: WRITABLE_CAPABILITY,
            auditRef: auditRef('draft_read', 'allowed'),
          },
        }
    ),
  };
  const saveUseCase = {
    execute: vi.fn(
      async () =>
        options?.saveResult ?? {
          kind: 'response',
          httpStatus: 422,
          response: {
            kind: 'unsupported_schema_version',
            capability: WRITABLE_CAPABILITY,
            auditRef: auditRef('draft_write', 'allowed'),
            expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
            requestedSchemaVersion: 'workspace-graph-draft.v0',
          },
        }
    ),
  };
  const telemetry = {
    recordRead: vi.fn(),
    recordWrite: vi.fn(),
  };

  const authenticator = {
    authenticateBearerToken: vi.fn(async () => ({
      ok: true as const,
      principal: {
        principalId: 'user-1',
        subjectId: 'user-1',
        issuer: 'issuer',
        audience: 'audience',
        principalType: 'user' as const,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        rawScopes: [],
        assertedTenantIds: [TEST_SCOPE.tenantId],
        assertedProjectIds: [TEST_SCOPE.projectId],
      },
    })),
  };
  registerWorkspaceGraphDraftRoutes(app, {
    authenticator,
    capabilityService: capabilityService as never,
    getUseCase: getUseCase as never,
    saveUseCase: saveUseCase as never,
    telemetry,
    observability: createNoopObservability(),
    rateLimit: options?.rateLimit ?? { max: 100, timeWindow: 60_000 },
  });

  return { app, authenticator, capabilityService, getUseCase, saveUseCase, telemetry };
}

describe('workspaceGraphDraftRoutes', () => {
  it('stops at the shared authentication boundary', async () => {
    const context = createApp();
    context.authenticator.authenticateBearerToken.mockResolvedValueOnce({
      ok: false,
      code: 'missing_token',
    });

    try {
      const response = await context.app.inject({
        method: 'GET',
        url: '/workspace/graph/draft?tenantId=tenant-api-it&projectId=project-api-it&environmentId=env-api-it',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: { type: 'unauthorized', reason: 'authentication_failed' },
      });
      expect(context.capabilityService.authorize).not.toHaveBeenCalled();
      expect(context.getUseCase.execute).not.toHaveBeenCalled();
    } finally {
      await context.app.close();
    }
  });

  it('rejects missing workspace scope in the read route', async () => {
    const { app } = createApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/workspace/graph/draft?tenantId=tenant-api-it&projectId=project-api-it',
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'missing_environment_id',
          target: 'environmentId',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('preserves the governed not-found read outcome', async () => {
    const { app, authenticator, capabilityService, telemetry } = createApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/workspace/graph/draft?tenantId=tenant-api-it&projectId=project-api-it&environmentId=env-api-it',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        kind: 'not_found',
        capability: WRITABLE_CAPABILITY,
        auditRef: auditRef('draft_read', 'allowed'),
      });
      expect(telemetry.recordRead).toHaveBeenCalledWith(
        'not_found',
        'writable',
        expect.any(Number)
      );
      expect(authenticator.authenticateBearerToken).toHaveBeenCalledOnce();
      expect(capabilityService.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          principal: expect.objectContaining({ principalId: 'user-1' }),
        })
      );
    } finally {
      await app.close();
    }
  });

  it('preserves the governed unsupported-schema save outcome', async () => {
    const { app, telemetry } = createApp();

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/workspace/graph/draft',
        payload: {
          ...buildWorkspaceGraphDraftSaveRequest(),
          schemaVersion: 'workspace-graph-draft.v0',
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        kind: 'unsupported_schema_version',
        capability: WRITABLE_CAPABILITY,
        auditRef: auditRef('draft_write', 'allowed'),
        expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        requestedSchemaVersion: 'workspace-graph-draft.v0',
      });
      expect(telemetry.recordWrite).toHaveBeenCalledWith('denied', 'writable', expect.any(Number));
    } finally {
      await app.close();
    }
  });

  it('preserves the governed file-authority conflict outcome', async () => {
    const { app, telemetry } = createApp({
      saveResult: {
        kind: 'response',
        httpStatus: 409,
        response: {
          kind: 'authoring_authority_conflict',
          capability: WRITABLE_CAPABILITY,
          auditRef: auditRef('draft_write', 'conflict'),
          canvasIds: ['orders-canvas'],
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/workspace/graph/draft',
        payload: buildWorkspaceGraphDraftSaveRequest(),
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        kind: 'authoring_authority_conflict',
        capability: WRITABLE_CAPABILITY,
        auditRef: auditRef('draft_write', 'conflict'),
        canvasIds: ['orders-canvas'],
      });
      expect(telemetry.recordWrite).toHaveBeenCalledWith(
        'conflict',
        'writable',
        expect.any(Number)
      );
    } finally {
      await app.close();
    }
  });

  it('rate limits repeated save attempts before authorizing them again', async () => {
    const app = Fastify({ logger: false });
    const routeRateLimit = { max: 1, timeWindow: 60_000 } as const;
    await app.register(rateLimit, { global: false, ...routeRateLimit });
    const context = createApp({ app, rateLimit: routeRateLimit });

    try {
      const payload = buildWorkspaceGraphDraftSaveRequest();
      const first = await app.inject({
        method: 'PUT',
        url: '/workspace/graph/draft',
        payload,
      });
      const second = await app.inject({
        method: 'PUT',
        url: '/workspace/graph/draft',
        payload,
      });

      expect(first.statusCode).not.toBe(429);
      expect(second.statusCode).toBe(429);
      expect(context.capabilityService.authorize).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
