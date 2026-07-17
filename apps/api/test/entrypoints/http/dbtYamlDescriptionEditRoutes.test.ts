import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { DbtYamlDescriptionRevisionConflictError } from '../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { registerDbtYamlDescriptionEditRoutes } from '../../../src/entrypoints/http/dbtYamlDescriptionEditRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

describe('dbtYamlDescriptionEditRoutes', () => {
  it('authorizes read access and proposes the exact resource edit', async () => {
    const propose = vi.fn().mockResolvedValue(proposal());
    const auth = authorizedRuntimeAuth();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      transaction: { propose, apply: vi.fn(), revert: vi.fn() },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/proposals?${SCOPE_QUERY}`,
      payload: {
        canvasId: 'canvas-orders',
        resourceUniqueId: 'model.analytics.orders',
        nextDescription: 'Customer orders',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(proposal());
    expect(propose).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      canvasId: 'canvas-orders',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });
    expect(auth.actions()).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'query', name: 'workspace:files:view' },
    ]);
  });

  it('requires file-save authority before applying a validated proposal', async () => {
    const apply = vi.fn().mockResolvedValue(appliedReceipt());
    const auth = authorizedRuntimeAuth();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      transaction: { propose: vi.fn(), apply, revert: vi.fn() },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/applications?${SCOPE_QUERY}`,
      payload: { proposal: proposal(), idempotencyKey: 'edit-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(apply).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      proposal: proposal(),
      idempotencyKey: 'edit-1',
    });
    expect(auth.actions()).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'command', name: 'workspace:files:save' },
    ]);
  });

  it('does not apply when file-save authority is absent', async () => {
    const apply = vi.fn();
    const auth = authorizedRuntimeAuth('workspace:files:save');
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      transaction: { propose: vi.fn(), apply, revert: vi.fn() },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/applications?${SCOPE_QUERY}`,
      payload: { proposal: proposal(), idempotencyKey: 'edit-1' },
    });

    expect(response.statusCode).toBe(403);
    expect(apply).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies before authorization or transaction execution', async () => {
    const propose = vi.fn();
    const authenticateBearerToken = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      authenticator: { authenticateBearerToken } as never,
      authorizer: {} as never,
      transaction: { propose, apply: vi.fn(), revert: vi.fn() },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/proposals?${SCOPE_QUERY}`,
      payload: { canvasId: 'canvas-orders', resourceUniqueId: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(authenticateBearerToken).not.toHaveBeenCalled();
    expect(propose).not.toHaveBeenCalled();
  });

  it('returns an explicit conflict for stale apply and revert revisions', async () => {
    const conflict = new DbtYamlDescriptionRevisionConflictError(
      'analytics/models/orders.yml',
      'f'.repeat(64)
    );
    const auth = authorizedRuntimeAuth();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      transaction: {
        propose: vi.fn(),
        apply: vi.fn().mockRejectedValue(conflict),
        revert: vi.fn().mockRejectedValue(conflict),
      },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const applyResponse = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/applications?${SCOPE_QUERY}`,
      payload: { proposal: proposal(), idempotencyKey: 'edit-1' },
    });
    const revertResponse = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/reverts?${SCOPE_QUERY}`,
      payload: { appliedReceipt: appliedReceipt(), idempotencyKey: 'revert-1' },
    });

    expect(applyResponse.statusCode).toBe(409);
    expect(applyResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_yaml_description_revision_conflict' },
    });
    expect(revertResponse.statusCode).toBe(409);
  });
});

function proposal() {
  return {
    schemaVersion: 'dbt-yaml-description-edit-proposal.v1' as const,
    canvasId: 'canvas-orders',
    resource: {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model' as const,
      name: 'orders',
    },
    path: 'analytics/models/orders.yml',
    previousDescription: 'Old description',
    nextDescription: 'Customer orders',
    expectedContentSha256: 'a'.repeat(64),
    candidateContent: 'version: 2\nmodels: []\n',
    candidateContentSha256: 'b'.repeat(64),
    unifiedDiff: '-old\n+new',
    proposalDigest: 'c'.repeat(64),
  };
}

function appliedReceipt() {
  return {
    schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1' as const,
    receiptId: 'd'.repeat(64),
    canvasId: 'canvas-orders',
    resource: proposal().resource,
    path: proposal().path,
    previousDescription: proposal().previousDescription,
    nextDescription: proposal().nextDescription,
    expectedContentSha256: proposal().expectedContentSha256,
    appliedContentSha256: proposal().candidateContentSha256,
    proposalDigest: proposal().proposalDigest,
    idempotencyKey: 'edit-1',
    requestHash: 'e'.repeat(64),
    deduplicated: false,
    analysis: {
      freshness: 'fresh' as const,
      analysisSha256: 'f'.repeat(64),
      projectContentSetSha256: '1'.repeat(64),
    },
  };
}

function authorizedRuntimeAuth(deniedAction?: string) {
  const authorize = vi.fn().mockImplementation((_principal, requestedScope) =>
    requestedScope.action.name === deniedAction
      ? { ok: false, reason: 'ACTION_NOT_GRANTED' }
      : {
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-07-17T00:00:00Z'),
          },
        }
  );
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
    } as never,
    authorizer: { authorize } as never,
    actions: () => authorize.mock.calls.map(([, requestedScope]) => requestedScope.action),
  };
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
