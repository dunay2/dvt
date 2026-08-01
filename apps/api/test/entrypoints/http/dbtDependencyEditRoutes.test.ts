import {
  DbtDependencyEditRequestSchema,
  DbtDependencyEditResultSchema,
  type DbtDependencyEditRequest,
  type DbtDependencyEditResult,
} from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { DbtDependencyEditReceiptInvalidError } from '../../../src/application/ports/dbtDependencyEdit.js';
import { registerDbtDependencyEditRoutes } from '../../../src/entrypoints/http/dbtDependencyEditRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

describe('dbtDependencyEditRoutes', () => {
  it('authorizes file mutation and returns the command result', async () => {
    const apply = vi.fn().mockResolvedValue(noChangeResult());
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
    registerDbtDependencyEditRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: { authorize } as never,
      command: { apply },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/dependency-edits/applications?${SCOPE_QUERY}`,
      payload: request(),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(noChangeResult());
    expect(authorize.mock.calls.map(([, requestedScope]) => requestedScope.action)).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'command', name: 'workspace:files:save' },
    ]);
    expect(apply).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      ...request(),
    });
  });

  it('rejects an invalid body before authorization or command execution', async () => {
    const apply = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtDependencyEditRoutes(app, {
      authenticator: {} as never,
      authorizer: {} as never,
      command: { apply },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/dependency-edits/applications?${SCOPE_QUERY}`,
      payload: { ...request(), nextTargetUniqueId: '', replacementSource: 'not allowed' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: 'bad_request', reason: 'invalid_dbt_dependency_edit_request', target: 'body' },
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('rejects a missing bearer token before command execution', async () => {
    const apply = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtDependencyEditRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({
          ok: false,
          code: 'missing_bearer_token',
        }),
      } as never,
      authorizer: {} as never,
      command: { apply },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/dependency-edits/applications?${SCOPE_QUERY}`,
      payload: request(),
    });

    expect(response.statusCode).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it('denies callers without workspace file save authority', async () => {
    const apply = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtDependencyEditRoutes(app, {
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
      command: { apply },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/dependency-edits/applications?${SCOPE_QUERY}`,
      payload: request(),
    });

    expect(response.statusCode).toBe(403);
    expect(apply).not.toHaveBeenCalled();
  });

  it('maps an invalid immutable receipt to an HTTP conflict', async () => {
    const app = Fastify({ logger: false });
    registerDbtDependencyEditRoutes(app, {
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
      command: {
        apply: vi.fn().mockRejectedValue(new DbtDependencyEditReceiptInvalidError('a'.repeat(64))),
      },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/dependency-edits/applications?${SCOPE_QUERY}`,
      payload: request(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_dependency_edit_receipt_invalid' },
    });
  });
});

function request(): DbtDependencyEditRequest {
  return DbtDependencyEditRequestSchema.parse({
    schemaVersion: 'dbt-dependency-edit-request.v1',
    canvasId: 'canvas-orders',
    selectedUniqueId: 'model.analytics.orders',
    expectedProjectContentSetSha256: 'a'.repeat(64),
    expectedAnalysisSha256: 'b'.repeat(64),
    expectedSelectedAnalysisSha256: 'c'.repeat(64),
    regionId: 'region-orders-source',
    expectedTargetUniqueId: 'source.analytics.raw.orders',
    nextTargetUniqueId: 'source.analytics.raw.customers',
    idempotencyKey: 'edit-source-1',
  });
}

function noChangeResult(): DbtDependencyEditResult {
  return DbtDependencyEditResultSchema.parse({
    schemaVersion: 'dbt-dependency-edit-result.v1',
    kind: 'no_change',
    canvasId: 'canvas-orders',
    selectedUniqueId: 'model.analytics.orders',
    regionId: 'region-orders-source',
    targetUniqueId: 'source.analytics.raw.customers',
    projectContentSetSha256: 'a'.repeat(64),
    analysisSha256: 'b'.repeat(64),
    selectedAnalysisSha256: 'c'.repeat(64),
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
