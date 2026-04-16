import { createNoopObservability } from '@dvt/observability';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../../src/application/ports/workspaceGraphDraft.js';
import { registerWorkspaceGraphDraftRoutes } from '../../../src/entrypoints/http/workspaceGraphDraftRoutes.js';
import { buildWorkspaceGraphDraftSaveRequest } from '../../fixtures/workspaceGraphDraftFixture.js';

interface TestAppContext {
  readonly app: FastifyInstance;
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

function createApp(options?: {
  readonly decision?: Record<string, unknown>;
  readonly readResult?: Record<string, unknown>;
  readonly saveResult?: Record<string, unknown>;
}): TestAppContext {
  const app = Fastify({ logger: false });
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
      scope: {
        tenantId: 'tenant-api-it',
        projectId: 'project-api-it',
        environmentId: 'env-api-it',
      },
      capability: {
        scope: {
          tenantId: 'tenant-api-it',
          projectId: 'project-api-it',
          environmentId: 'env-api-it',
        },
        mode: 'writable',
        canRead: true,
        canWrite: true,
        reason: 'authorized',
      },
      ...(options?.decision ?? {}),
    })),
  };
  const getUseCase = {
    execute: vi.fn(async () => options?.readResult ?? { kind: 'not_found' }),
  };
  const saveUseCase = {
    execute: vi.fn(async () =>
      options?.saveResult ?? {
        kind: 'unsupported_schema_version',
      }
    ),
  };
  const telemetry = {
    recordRead: vi.fn(),
    recordWrite: vi.fn(),
  };

  registerWorkspaceGraphDraftRoutes(app, {
    capabilityService: capabilityService as never,
    getUseCase: getUseCase as never,
    saveUseCase: saveUseCase as never,
    telemetry,
    observability: createNoopObservability(),
  });

  return { app, capabilityService, getUseCase, saveUseCase, telemetry };
}

describe('workspaceGraphDraftRoutes', () => {
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

  it('maps missing persisted draft to a 404 envelope with correlation keys', async () => {
    const { app, telemetry } = createApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/workspace/graph/draft?tenantId=tenant-api-it&projectId=project-api-it&environmentId=env-api-it',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: {
          type: 'not_found',
          reason: 'workspace_graph_draft_not_found',
          details: {
            correlationId: 'req-1',
            decisionId: 'dec-1',
          },
        },
      });
      expect(telemetry.recordRead).toHaveBeenCalledWith('not_found', 'writable', expect.any(Number));
    } finally {
      await app.close();
    }
  });

  it('maps unsupported schema versions on save to a 422 envelope', async () => {
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
        error: {
          type: 'unprocessable',
          reason: 'workspace_graph_draft_unsupported_schema_version',
          details: {
            expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          },
        },
      });
      expect(telemetry.recordWrite).toHaveBeenCalledWith('denied', 'writable', expect.any(Number));
    } finally {
      await app.close();
    }
  });
});
