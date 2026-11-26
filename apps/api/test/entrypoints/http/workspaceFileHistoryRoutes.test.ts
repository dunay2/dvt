import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi, type Mock } from 'vitest';

import type { IWorkspaceFileHistoryRepository } from '../../../src/application/ports/workspaceFileHistory.js';
import { ListWorkspaceFileHistoryUseCase } from '../../../src/application/services/listWorkspaceFileHistoryUseCase.js';
import { registerWorkspaceFileHistoryRoutes } from '../../../src/entrypoints/http/workspaceFileHistoryRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

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

describe('workspaceFileHistoryRoutes', () => {
  function buildApp(
    options: {
      readonly authenticated?: boolean;
      readonly authorized?: boolean;
      readonly repository?: IWorkspaceFileHistoryRepository;
      readonly commitFileVersion?: Mock;
    } = {}
  ): { readonly app: FastifyInstance; readonly authorize: Mock } {
    const app = Fastify({ logger: false });
    const repository =
      options.repository ??
      ({
        listFileHistory: vi.fn().mockResolvedValue([
          {
            commitSha: '0123456789abcdef',
            shortSha: '0123456',
            authorName: 'Ada',
            authoredAt: '2026-05-22T12:00:00.000Z',
            subject: 'Update staging orders model',
            path: 'models/staging/stg_orders.sql',
          },
        ]),
        getFileVersionContent: vi.fn().mockResolvedValue('select 1;'),
      } satisfies IWorkspaceFileHistoryRepository);
    const authorize = vi.fn().mockResolvedValue(
      options.authorized === false
        ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
        : {
            ok: true,
            context: {
              principal: principal(),
              scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
              action: { kind: 'query', name: 'workspace:files:view' },
              requestId: 'req-1',
              authorizedAt: new Date('2026-05-22T00:00:00Z'),
            },
          }
    );

    registerWorkspaceFileHistoryRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue(
          options.authenticated === false
            ? { ok: false, code: 'missing_token' }
            : {
                ok: true,
                principal: principal(),
              }
        ),
      } as never,
      authorizer: { authorize } as never,
      listUseCase: new ListWorkspaceFileHistoryUseCase(repository),
      versionQuery: repository,
      versionCommand: { commitFileVersion: options.commitFileVersion ?? vi.fn() },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    return { app, authorize };
  }

  it('returns scoped file history for a selected workspace file', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/file-history/models%2Fstaging%2Fstg_orders.sql?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        commitSha: '0123456789abcdef',
        shortSha: '0123456',
        authorName: 'Ada',
        authoredAt: '2026-05-22T12:00:00.000Z',
        subject: 'Update staging orders model',
        path: 'models/staging/stg_orders.sql',
      },
    ]);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:files:view' } }),
      expect.any(String)
    );
  });

  it('fails closed when the bearer token is missing', async () => {
    const { app } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/file-history/models%2Fstg_orders.sql?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        type: 'unauthorized',
        reason: 'missing_token',
      },
    });
  });

  it('fails closed when required scope is missing', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/file-history/models%2Fstg_orders.sql?tenantId=tenant-a&projectId=project-a',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'missing_environment_id',
        target: 'environmentId',
      },
    });
  });

  it('rejects invalid file-history paths before querying history', async () => {
    const repository = {
      listFileHistory: vi.fn(),
      getFileVersionContent: vi.fn(),
    } satisfies IWorkspaceFileHistoryRepository;
    const { app } = buildApp({ repository });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/file-history/..%2Fpackage.json?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_workspace_path',
        target: 'path',
      },
    });
    expect(repository.listFileHistory).not.toHaveBeenCalled();
  });

  it('requires the workspace write grant and uses the authenticated Git author', async () => {
    const commitFileVersion = vi
      .fn()
      .mockResolvedValue({ kind: 'committed', commitSha: 'a'.repeat(40) });
    const { app, authorize } = buildApp({ commitFileVersion });
    const expectedContentSha256 = 'b'.repeat(64);
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/file-history/operations%2Ftarea.task.sql?${SCOPE_QUERY}`,
      payload: { expectedContentSha256, author: 'spoofed' },
    });
    expect(response.statusCode).toBe(200);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'command', name: 'workspace:files:save' } }),
      expect.any(String)
    );
    expect(commitFileVersion).toHaveBeenCalledWith(
      { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      { path: 'operations/tarea.task.sql', expectedContentSha256, author: 'user-1' }
    );
    await app.close();
  });
});
