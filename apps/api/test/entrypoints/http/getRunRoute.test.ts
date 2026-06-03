import { describe, expect, it, vi } from 'vitest';

import { getRunRoute } from '../../../src/entrypoints/http/getRunRoute.js';

type RouteReply = {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
};

const DEFAULT_RESULT: {
  runId: string;
  tenantId: string;
  status: string;
  enriched: boolean;
  snapshotStaleness: string;
  execution?: {
    activeStepId?: string;
    failure?: {
      stepId: string;
      reason?: string;
      message?: string;
      failedAt: string;
    };
    materialization?: {
      executor: 'postgres' | 'dbt';
      environmentId: string;
      sinkTable: string;
      rowsWritten: number;
      startedAt: string;
      completedAt: string;
      durationMs: number;
    };
  };
  provenance?: {
    persistedPlan: {
      planRecordId: string;
      planVersion: string;
      sourceRef: string;
      canonicalPlanSha256: string;
    };
    authoring?: {
      graphArtifact?: {
        repo: string;
        path: string;
        ref?: string;
        commitSha?: string;
        contentSha256?: string;
      };
      sqlArtifact?: {
        repo: string;
        path: string;
        ref?: string;
        commitSha?: string;
        contentSha256?: string;
      };
    };
  };
} = {
  runId: 'run-1',
  tenantId: 'tenant-a',
  status: 'RUNNING',
  enriched: false,
  snapshotStaleness: 'FRESH',
};

function createReply(): RouteReply {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };
}

function httpError(
  type: string,
  reason: string,
  extra?: { target?: string; details?: Record<string, unknown> }
): { error: { type: string; reason: string; target?: string; details?: Record<string, unknown> } } {
  return {
    error: {
      type,
      reason,
      ...(extra?.target === undefined ? {} : { target: extra.target }),
      ...(extra?.details === undefined ? {} : { details: extra.details }),
    },
  };
}

function createDeps(result = DEFAULT_RESULT): {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
  useCase: { execute: ReturnType<typeof vi.fn> };
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
          scope: { resource: 'tenant', tenantId: { value: 'tenant-a' } },
          action: { kind: 'query', name: 'run:view' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue(result),
    },
  };
}

describe('getRunRoute', () => {
  it('returns 200 with snapshot status by default', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', enriched: false },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('passes enriched=true explicitly to the use case', async () => {
    const deps = createDeps({
      runId: 'run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: true,
      snapshotStaleness: 'FRESH',
    });
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-2',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', enriched: 'true' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', enriched: true },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns failed outcome fields unchanged from the use case result', async () => {
    const result = {
      ...DEFAULT_RESULT,
      status: 'FAILED',
      execution: {
        activeStepId: 'step-evidence',
        failure: {
          stepId: 'step-transform',
          reason: 'SINK_WRITE_FAILED',
          message: 'duplicate key value violates unique constraint',
          failedAt: '2026-04-08T10:00:03.000Z',
        },
      },
    };
    const deps = createDeps(result);
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-2b',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.send).toHaveBeenCalledWith(result);
  });

  it('returns provenance linkage fields unchanged from the use case result', async () => {
    const result = {
      ...DEFAULT_RESULT,
      provenance: {
        persistedPlan: {
          planRecordId: 'plan-1',
          planVersion: '1.0',
          sourceRef: 'plan://persisted/plan-1',
          canonicalPlanSha256: 'a'.repeat(64),
        },
        authoring: {
          graphArtifact: {
            repo: 'acme/warehouse',
            path: 'graphs/orders.flow.yaml',
            commitSha: '1'.repeat(40),
          },
          sqlArtifact: {
            repo: 'acme/warehouse',
            path: 'models/orders_daily.sql',
            commitSha: '2'.repeat(40),
          },
        },
      },
    };
    const deps = createDeps(result);
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-2c',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.send).toHaveBeenCalledWith(result);
  });

  it('returns 400 when runId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      { id: 'req-3', headers: {}, params: {}, query: { tenantId: 'tenant-a' } } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_run_id', { target: 'runId' })
    );
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      { id: 'req-4', headers: {}, params: { runId: 'run-1' }, query: {} } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('forbidden', 'missing_tenant_scope', { target: 'tenantId' })
    );
  });

  it('returns 400 when tenantId is present but invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-4b',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: '   ' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_tenant_id', { target: 'tenantId' })
    );
  });

  it('returns 400 when enriched query value is invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-5',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', enriched: 'sometimes' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_enriched_flag', { target: 'enriched' })
    );
  });
});
