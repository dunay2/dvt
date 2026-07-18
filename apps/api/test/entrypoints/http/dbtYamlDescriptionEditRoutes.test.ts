import type {
  DbtYamlDescriptionAppliedReceipt,
  DbtYamlDescriptionEditProposal,
} from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionRevisionConflictError,
} from '../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { WorkspaceFileBatchIdempotencyConflictError } from '../../../src/application/ports/workspaceFiles.js';
import { registerDbtYamlDescriptionEditRoutes } from '../../../src/entrypoints/http/dbtYamlDescriptionEditRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

describe('dbtYamlDescriptionEditRoutes', () => {
  it('authorizes read access and proposes the exact resource edit', async () => {
    const propose = vi.fn().mockResolvedValue(proposal());
    const auth = authorizedRuntimeAuth();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      proposalQuery: { propose },
      applyCommand: { apply: vi.fn() },
      revertCommand: { revert: vi.fn() },
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
      proposalQuery: { propose: vi.fn() },
      applyCommand: { apply },
      revertCommand: { revert: vi.fn() },
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
      proposalQuery: { propose: vi.fn() },
      applyCommand: { apply },
      revertCommand: { revert: vi.fn() },
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

  it('does not revert when file-save authority is absent', async () => {
    const revert = vi.fn();
    const auth = authorizedRuntimeAuth('workspace:files:save');
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      proposalQuery: { propose: vi.fn() },
      applyCommand: { apply: vi.fn() },
      revertCommand: { revert },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/description-edits/reverts?${SCOPE_QUERY}`,
      payload: { appliedReceiptId: appliedReceipt().receiptId, idempotencyKey: 'revert-1' },
    });

    expect(response.statusCode).toBe(403);
    expect(revert).not.toHaveBeenCalled();
  });

  it('does not execute any description rail without a bearer token', async () => {
    const propose = vi.fn();
    const apply = vi.fn();
    const revert = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: false, code: 'missing_token' }),
      } as never,
      authorizer: {} as never,
      proposalQuery: { propose },
      applyCommand: { apply },
      revertCommand: { revert },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const requests = [
      {
        path: '/workspace/dbt/description-edits/proposals',
        payload: {
          canvasId: 'canvas-orders',
          resourceUniqueId: 'model.analytics.orders',
          nextDescription: 'Customer orders',
        },
      },
      {
        path: '/workspace/dbt/description-edits/applications',
        payload: { proposal: proposal(), idempotencyKey: 'edit-1' },
      },
      {
        path: '/workspace/dbt/description-edits/reverts',
        payload: { appliedReceiptId: appliedReceipt().receiptId, idempotencyKey: 'revert-1' },
      },
    ];
    for (const request of requests) {
      const response = await app.inject({
        method: 'POST',
        url: `${request.path}?${SCOPE_QUERY}`,
        payload: request.payload,
      });
      expect(response.statusCode).toBe(401);
    }
    expect(propose).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(revert).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies before authorization or transaction execution', async () => {
    const propose = vi.fn();
    const authenticateBearerToken = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      authenticator: { authenticateBearerToken } as never,
      authorizer: {} as never,
      proposalQuery: { propose },
      applyCommand: { apply: vi.fn() },
      revertCommand: { revert: vi.fn() },
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
      proposalQuery: { propose: vi.fn() },
      applyCommand: { apply: vi.fn().mockRejectedValue(conflict) },
      revertCommand: { revert: vi.fn().mockRejectedValue(conflict) },
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
      payload: { appliedReceiptId: appliedReceipt().receiptId, idempotencyKey: 'revert-1' },
    });

    expect(applyResponse.statusCode).toBe(409);
    expect(applyResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_yaml_description_revision_conflict' },
    });
    expect(revertResponse.statusCode).toBe(409);
  });

  it('translates untrusted receipt IDs and idempotency collisions explicitly', async () => {
    const auth = authorizedRuntimeAuth();
    const app = Fastify({ logger: false });
    registerDbtYamlDescriptionEditRoutes(app, {
      ...auth,
      proposalQuery: { propose: vi.fn() },
      applyCommand: {
        apply: vi.fn().mockRejectedValue(new WorkspaceFileBatchIdempotencyConflictError('edit-1')),
      },
      revertCommand: {
        revert: vi
          .fn()
          .mockRejectedValue(new DbtYamlDescriptionReceiptInvalidError('d'.repeat(64))),
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
      payload: { appliedReceiptId: 'd'.repeat(64), idempotencyKey: 'revert-1' },
    });

    expect(applyResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_yaml_description_idempotency_conflict' },
    });
    expect(revertResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_yaml_description_receipt_invalid' },
    });
  });
});

function proposal(): DbtYamlDescriptionEditProposal {
  return {
    schemaVersion: 'dbt-yaml-description-edit-proposal.v1' as const,
    canvasId: 'canvas-orders',
    resource: {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model' as const,
      name: 'orders',
      packageName: 'analytics',
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

function appliedReceipt(): DbtYamlDescriptionAppliedReceipt {
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
      targetContentSha256: proposal().candidateContentSha256,
    },
  };
}

function authorizedRuntimeAuth(deniedAction?: string): {
  authenticator: never;
  authorizer: never;
  actions: () => unknown[];
} {
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
