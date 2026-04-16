import { describe, expect, it, vi } from 'vitest';

import { getRunEventsRoute } from '../../../src/entrypoints/http/getRunEventsRoute.js';

function createReply(): {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
} {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };
}

function httpError(
  type: string,
  reason: string,
  target?: string
): { error: { type: string; reason: string; target?: string } } {
  return {
    error: {
      type,
      reason,
      ...(target === undefined ? {} : { target }),
    },
  };
}

function createDeps(): {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
  useCase: { execute: ReturnType<typeof vi.fn> };
} {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({
        ok: true,
        principal: {
          principalId: 'u',
          subjectId: 'u',
          issuer: 'i',
          audience: 'a',
          principalType: 'user',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: [],
          assertedTenantIds: ['tenant-a'],
          assertedProjectIds: [],
        },
      }),
    },
    authorizer: {
      authorize: vi.fn().mockResolvedValue({
        ok: true,
        context: {
          principal: {},
          scope: { tenantId: { value: 'tenant-a' } },
          action: { kind: 'query', name: 'run:logs:view' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({ items: [{ runSeq: 1 }], nextCursor: 1 }),
    },
  };
}

describe('getRunEventsRoute', () => {
  it('returns 200 with tenant-scoped run events', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', afterSeq: '0', limit: '10' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', afterSeq: 0, limit: 10 },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns TF-C2-B evidence-bearing event payloads unchanged from the use case', async () => {
    const deps = createDeps();
    deps.useCase.execute.mockResolvedValue({
      items: [
        {
          eventId: 'evt-1',
          eventType: 'StepCompleted',
          runId: 'run-1',
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          planId: 'plan-1',
          planVersion: '1.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'idem-1',
          emittedAt: '2026-04-08T10:00:00.000Z',
          persistedAt: '2026-04-08T10:00:01.000Z',
          payloadVersion: 1,
          stepId: 'step-evidence',
          payload: {
            resultEvidence: {
              executor: 'postgres',
              environmentId: 'env-1',
              sinkTable: 'analytics.orders_daily',
              rowsWritten: 42,
              startedAt: '2026-04-08T10:00:00.000Z',
              completedAt: '2026-04-08T10:00:01.000Z',
              durationMs: 1000,
            },
          },
          runSeq: 7,
        },
      ],
      nextCursor: 7,
    });
    const reply = createReply();

    await getRunEventsRoute(
      {
        id: 'req-1b',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', afterSeq: '0', limit: '10' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.send).toHaveBeenCalledWith({
      items: [
        expect.objectContaining({
          eventType: 'StepCompleted',
          stepId: 'step-evidence',
          payload: expect.objectContaining({
            resultEvidence: expect.objectContaining({
              sinkTable: 'analytics.orders_daily',
              rowsWritten: 42,
            }),
          }),
        }),
      ],
      nextCursor: 7,
    });
  });

  it('returns 400 when runId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-2', headers: {}, params: {}, query: { tenantId: 'tenant-a' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(httpError('bad_request', 'invalid_run_id', 'runId'));
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-3', headers: {}, params: { runId: 'run-1' }, query: {} } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('forbidden', 'missing_tenant_scope', 'tenantId')
    );
  });

  it('returns 400 when tenantId is present but invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      {
        id: 'req-3b',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: '   ' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_tenant_id', 'tenantId')
    );
  });

  it('returns 400 when afterSeq is not numeric', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      {
        id: 'req-4',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', afterSeq: 'abc' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_after_seq', 'afterSeq')
    );
  });
});
