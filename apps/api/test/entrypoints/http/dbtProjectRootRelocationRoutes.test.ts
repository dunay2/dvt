import { URLSearchParams } from 'node:url';

import { createDbtProjectRootRelocationPlan } from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerDbtProjectRootRelocationRoutes } from '../../../src/entrypoints/http/dbtProjectRootRelocationRoutes.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const query = new URLSearchParams(scope).toString();
const plan = createDbtProjectRootRelocationPlan({
  schemaVersion: 'dbt-project-root-relocation-plan.v1',
  scope,
  canvasId: 'files',
  sourceRoot: 'imported',
  targetRoot: '.',
  authorityRevision: 'before',
  files: [
    {
      sourcePath: 'imported/dbt_project.yml',
      targetPath: 'dbt_project.yml',
      contentSha256: 'a'.repeat(64),
      targetContentSha256: null,
    },
  ],
});

function setup(
  authenticated = true,
  authorized = true
): {
  app: ReturnType<typeof Fastify>;
  preview: ReturnType<typeof vi.fn>;
  relocate: ReturnType<typeof vi.fn>;
  authorize: ReturnType<typeof vi.fn>;
} {
  const app = Fastify();
  const preview = vi.fn().mockResolvedValue({ kind: 'ready', plan });
  const relocate = vi.fn().mockResolvedValue({ kind: 'refused', reason: 'stale_files' });
  const authorize = vi
    .fn()
    .mockResolvedValue(
      authorized ? { ok: true, context: {} } : { ok: false, reason: 'ACTION_NOT_GRANTED' }
    );
  registerDbtProjectRootRelocationRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi
        .fn()
        .mockResolvedValue(
          authenticated
            ? {
                ok: true,
                principal: {
                  principalId: 'user',
                  subjectId: 'user',
                  issuer: 'issuer',
                  audience: 'audience',
                  principalType: 'user',
                  expiresAt: new Date('2030-01-01'),
                  rawScopes: [],
                  assertedTenantIds: ['tenant'],
                  assertedProjectIds: ['project'],
                },
              }
            : { ok: false, code: 'missing_token' }
        ),
    } as never,
    authorizer: { authorize } as never,
    previewQuery: { execute: preview } as never,
    relocateCommand: { execute: relocate } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return { app, preview, relocate, authorize };
}

describe('protected dbt root relocation routes', () => {
  it.each([
    [false, true, 401],
    [true, false, 403],
  ])(
    'rejects missing access before application IO (%s, %s)',
    async (authenticated, authorized, status) => {
      const fixture = setup(authenticated as boolean, authorized as boolean);
      try {
        for (const route of ['preview', 'apply']) {
          const response = await fixture.app.inject({
            method: 'POST',
            url: `/workspace/dbt/root-relocation${route === 'preview' ? '/preview' : ''}?${query}`,
            payload: route === 'preview' ? { canvasId: 'files' } : { plan },
          });
          expect(response.statusCode).toBe(status);
        }
        expect(fixture.preview).not.toHaveBeenCalled();
        expect(fixture.relocate).not.toHaveBeenCalled();
      } finally {
        await fixture.app.close();
      }
    }
  );
  it('uses the existing view/write capabilities and exact request scope', async () => {
    const fixture = setup();
    try {
      expect(
        (
          await fixture.app.inject({
            method: 'POST',
            url: `/workspace/dbt/root-relocation/preview?${query}`,
            payload: { canvasId: 'files' },
          })
        ).statusCode
      ).toBe(200);
      expect(fixture.preview).toHaveBeenCalledWith({ scope, canvasId: 'files' });
      expect(fixture.authorize).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ action: { kind: 'query', name: 'workspace:files:view' } }),
        expect.any(String)
      );
      expect(
        (
          await fixture.app.inject({
            method: 'POST',
            url: `/workspace/dbt/root-relocation?${query}`,
            payload: { plan },
          })
        ).statusCode
      ).toBe(409);
      expect(fixture.relocate).toHaveBeenCalledWith({ scope, plan });
      expect(fixture.authorize).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ action: { kind: 'command', name: 'workspace:files:save' } }),
        expect.any(String)
      );
    } finally {
      await fixture.app.close();
    }
  });
  it('rejects incomplete scope and tampered plans without invoking application services', async () => {
    const fixture = setup();
    try {
      expect(
        (
          await fixture.app.inject({
            method: 'POST',
            url: '/workspace/dbt/root-relocation/preview',
            payload: { canvasId: 'files' },
          })
        ).statusCode
      ).toBe(400);
      expect(
        (
          await fixture.app.inject({
            method: 'POST',
            url: `/workspace/dbt/root-relocation?${query}`,
            payload: { plan: { ...plan, sourceRoot: '../escape' } },
          })
        ).statusCode
      ).toBe(400);
      expect(fixture.preview).not.toHaveBeenCalled();
      expect(fixture.relocate).not.toHaveBeenCalled();
    } finally {
      await fixture.app.close();
    }
  });
});
