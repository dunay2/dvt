import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ListWorkspaceDiffChangesUseCase } from '../../../src/application/services/listWorkspaceDiffChangesUseCase.js';
import { registerWorkspaceDiffChangesRoutes } from '../../../src/entrypoints/http/workspaceDiffChangesRoutes.js';
import { LocalWorkspaceDiffChangesRepository } from '../../../src/infrastructure/workspaceDiffChanges/LocalWorkspaceDiffChangesRepository.js';

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

describe('workspaceDiffChangesRoutes', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-workspace-diff-'));
    await mkdir(path.join(root, 'target'), { recursive: true });
    await writeFile(
      path.join(root, 'target', 'diff_changes.json'),
      JSON.stringify([
        {
          id: 'diff-1',
          nodeId: 'model.orders',
          type: 'changed',
          severity: 'breaking',
          description: 'Column removed: discount_amount',
          oldValue: 'discount_amount DECIMAL',
          newValue: null,
        },
      ]),
      'utf8'
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function buildApp(
    options: {
      readonly authenticated?: boolean;
      readonly authorized?: boolean;
    } = {}
  ): { readonly app: FastifyInstance; readonly authorize: ReturnType<typeof vi.fn> } {
    const app = Fastify({ logger: false });
    const repository = new LocalWorkspaceDiffChangesRepository({ root });
    const authorize = vi.fn().mockResolvedValue(
      options.authorized === false
        ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
        : {
            ok: true,
            context: {
              principal: principal(),
              scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
              action: { kind: 'query', name: 'workspace:diff:view' },
              requestId: 'req-1',
              authorizedAt: new Date('2026-05-22T00:00:00Z'),
            },
          }
    );

    registerWorkspaceDiffChangesRoutes(app, {
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
      listUseCase: new ListWorkspaceDiffChangesUseCase(repository),
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    return { app, authorize };
  }

  it('returns scoped workspace diff changes from the backend read model', async () => {
    const { app, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/diff/changes?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'diff-1',
        nodeId: 'model.orders',
        type: 'changed',
        severity: 'breaking',
        description: 'Column removed: discount_amount',
        oldValue: 'discount_amount DECIMAL',
        newValue: null,
      },
    ]);
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:diff:view' } }),
      expect.any(String)
    );
  });

  it('returns an empty read model when no diff-change artifact has been published', async () => {
    await rm(path.join(root, 'target', 'diff_changes.json'), { force: true });
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/diff/changes?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('fails closed when the diff-change artifact is malformed', async () => {
    await writeFile(path.join(root, 'target', 'diff_changes.json'), '{"id":"not-array"}', 'utf8');
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/diff/changes?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_workspace_diff_changes',
      },
    });
  });

  it('fails closed when the workspace diff action is denied', async () => {
    const { app } = buildApp({ authorized: false });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/diff/changes?${SCOPE_QUERY}`,
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
      url: `/workspace/diff/changes?${SCOPE_QUERY}`,
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
      url: '/workspace/diff/changes?tenantId=tenant-a&projectId=project-a',
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
