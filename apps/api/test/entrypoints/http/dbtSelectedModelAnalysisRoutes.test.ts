import { DbtSelectedModelAnalysisSchema, type DbtSelectedModelAnalysis } from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { DbtProjectFileAuthorityRequiredError } from '../../../src/application/ports/dbtProjectImport.js';
import { registerDbtSelectedModelAnalysisRoutes } from '../../../src/entrypoints/http/dbtSelectedModelAnalysisRoutes.js';

const VALID_QUERY =
  'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=canvas-orders&selectedUniqueId=model.analytics.orders';

describe('dbtSelectedModelAnalysisRoutes', () => {
  it('authorizes and returns the selected-model analysis', async () => {
    const execute = vi.fn().mockResolvedValue(projection());
    const authorize = vi.fn().mockImplementation((_principal, requestedScope) => ({
      ok: true,
      context: {
        principal: principal(),
        scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
        action: requestedScope.action,
        requestId: 'req-1',
        authorizedAt: new Date('2026-08-01T00:00:00Z'),
      },
    }));
    const app = Fastify({ logger: false });
    registerDbtSelectedModelAnalysisRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: { authorize } as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/analysis/selected-model?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(projection());
    expect(authorize.mock.calls.map(([, requestedScope]) => requestedScope.action)).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'query', name: 'workspace:files:view' },
    ]);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      canvasId: 'canvas-orders',
      selectedUniqueId: 'model.analytics.orders',
    });
  });

  it.each([
    ['missing selection', 'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=c'],
    [
      'blank selection',
      'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=c&selectedUniqueId=',
    ],
  ])('rejects %s before invoking the query', async (_label, queryString) => {
    const execute = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtSelectedModelAnalysisRoutes(app, {
      authenticator: {} as never,
      authorizer: {} as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/analysis/selected-model?${queryString}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_selected_dbt_model_analysis_request',
        target: 'query',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('denies analysis when workspace files are not readable', async () => {
    const execute = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtSelectedModelAnalysisRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: {
        authorize: vi.fn().mockImplementation((_principal, requestedScope) =>
          requestedScope.action.name === 'workspace:graph-draft:view'
            ? {
                ok: true,
                context: {
                  principal: principal(),
                  scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
                  action: requestedScope.action,
                  requestId: 'req-1',
                  authorizedAt: new Date('2026-08-01T00:00:00Z'),
                },
              }
            : { ok: false, reason: 'ACTION_NOT_GRANTED' }
        ),
      } as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/analysis/selected-model?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns a conflict when the Canvas has no file authority', async () => {
    const app = Fastify({ logger: false });
    registerDbtSelectedModelAnalysisRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: {
        authorize: vi.fn().mockImplementation((_principal, requestedScope) => ({
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-08-01T00:00:00Z'),
          },
        })),
      } as never,
      query: { execute: vi.fn().mockRejectedValue(new DbtProjectFileAuthorityRequiredError()) },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/analysis/selected-model?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_project_file_authority_required' },
    });
  });
});

function projection(): DbtSelectedModelAnalysis {
  return DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'unavailable',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-orders',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-08-01T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
    },
    analysisSha256: 'b'.repeat(64),
    selectedAnalysisSha256: 'c'.repeat(64),
    capabilitySet: {
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: 'd'.repeat(64),
    },
    selectedUniqueId: 'model.analytics.orders',
    files: [],
    identities: [],
    dependencies: [],
    regions: [],
    diagnostics: [
      {
        code: 'dbt_analyzer_unavailable',
        severity: 'error',
        message: 'The server-managed dbt analyzer is unavailable.',
        subject: { kind: 'project' },
      },
    ],
  });
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
