import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GetWorkspaceFileContentUseCase } from '../../../src/application/services/getWorkspaceFileContentUseCase.js';
import { ListWorkspaceFilesUseCase } from '../../../src/application/services/listWorkspaceFilesUseCase.js';
import { registerWorkspaceFilesRoutes } from '../../../src/entrypoints/http/workspaceFilesRoutes.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';

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

describe('workspaceFilesRoutes', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-workspace-files-'));
    await mkdir(path.join(root, 'models', 'staging'), { recursive: true });
    await writeFile(path.join(root, 'README.md'), '# Workspace', 'utf8');
    await writeFile(
      path.join(root, 'models', 'staging', 'stg_orders.sql'),
      'select * from orders',
      'utf8'
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function buildApp(
    options: { readonly authenticated?: boolean; readonly authorized?: boolean } = {}
  ): { readonly app: FastifyInstance; readonly authorize: ReturnType<typeof vi.fn> } {
    const app = Fastify({ logger: false });
    const repository = new LocalWorkspaceFileRepository({ root });
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
              authorizedAt: new Date('2026-05-04T00:00:00Z'),
            },
          }
    );

    registerWorkspaceFilesRoutes(app, {
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
      getUseCase: new GetWorkspaceFileContentUseCase(repository),
      listUseCase: new ListWorkspaceFilesUseCase(repository),
    });

    return { app, authorize };
  }

  it('returns scoped workspace file tree', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'file', path: 'README.md' }),
        expect.objectContaining({
          kind: 'directory',
          path: 'models',
          children: expect.any(Array),
        }),
      ])
    );
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:files:view' } }),
      expect.any(String)
    );
  });

  it('returns scoped workspace file content', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files/models%2Fstaging%2Fstg_orders.sql?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      path: 'models/staging/stg_orders.sql',
      name: 'stg_orders.sql',
      language: 'sql',
      content: 'select * from orders',
    });
  });

  it('returns canonical not-found envelope for a missing workspace file', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files/models%2Fmissing.sql?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        type: 'not_found',
        reason: 'workspace_file_not_found',
      },
    });
  });

  it('rejects path traversal before reading from the repository', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files/..%2Fpackage.json?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_workspace_path',
        target: 'path',
      },
    });
  });

  it('fails closed when the workspace file action is denied', async () => {
    const { app } = buildApp({ authorized: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        type: 'forbidden',
        reason: 'action_not_granted',
      },
    });
  });

  it('fails closed when the bearer token is missing', async () => {
    const { app } = buildApp({ authenticated: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/files?${SCOPE_QUERY}`,
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
      url: '/workspace/files?tenantId=tenant-a&projectId=project-a',
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
});
