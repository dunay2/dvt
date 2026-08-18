import { describe, expect, it, vi } from 'vitest';

import { RunMaterializationSampleUnavailableError } from '../../../src/application/services/previewRunMaterializationRowsUseCase.js';
import { previewRunMaterializationRowsRoute } from '../../../src/entrypoints/http/previewRunMaterializationRowsRoute.js';

function createReply(): {
  readonly code: ReturnType<typeof vi.fn>;
  readonly send: ReturnType<typeof vi.fn>;
  readonly header: ReturnType<typeof vi.fn>;
} {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };
}

function createDeps(): {
  readonly authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  readonly authorizer: { authorize: ReturnType<typeof vi.fn> };
  readonly useCase: { execute: ReturnType<typeof vi.fn> };
} {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({
        ok: true,
        principal: {
          principalId: 'user-1',
          subjectId: 'user-1',
          issuer: 'issuer',
          audience: 'audience',
          principalType: 'user',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: [],
          assertedTenantIds: ['tenant-1'],
          assertedProjectIds: [],
        },
      }),
    },
    authorizer: {
      authorize: vi.fn().mockResolvedValue({
        ok: true,
        context: {
          principal: {},
          scope: { resource: 'tenant', tenantId: { value: 'tenant-1' } },
          action: { kind: 'query', name: 'run:view' },
          requestId: 'request-1',
          authorizedAt: new Date('2026-08-18T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({
        contractVersion: 1,
        connectionId: 'warehouse-a',
        objectId: 'relation/analytics_db/public/sink_1',
        columns: [{ name: 'id', type: 'integer', nullable: false }],
        rows: [{ values: ['1'] }],
        limit: 20,
        truncated: true,
        sampledAt: '2026-08-18T00:01:00.000Z',
      }),
    },
  };
}

describe('previewRunMaterializationRowsRoute', () => {
  it('authorizes the run and returns its bounded materialization sample', async () => {
    const deps = createDeps();
    const reply = createReply();

    await previewRunMaterializationRowsRoute(
      {
        id: 'request-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-1', limit: '20' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', limit: 20 },
      expect.objectContaining({ requestId: 'request-1' })
    );
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'relation/analytics_db/public/sink_1' })
    );
  });

  it.each(['0', '51', '1.5', 'not-a-number'])('rejects invalid limit %s', async (limit) => {
    const deps = createDeps();
    const reply = createReply();

    await previewRunMaterializationRowsRoute(
      {
        id: 'request-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-1', limit },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: { type: 'bad_request', reason: 'invalid_limit', target: 'limit' },
    });
  });

  it('returns a stable conflict reason when the run has no reviewable target', async () => {
    const deps = createDeps();
    deps.useCase.execute.mockRejectedValue(
      new RunMaterializationSampleUnavailableError('run_not_completed')
    );
    const reply = createReply();

    await previewRunMaterializationRowsRoute(
      {
        id: 'request-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-1' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'conflict',
        reason: 'run_materialization_sample_unavailable',
        target: 'runId',
        details: { cause: 'run_not_completed' },
      },
    });
  });
});
