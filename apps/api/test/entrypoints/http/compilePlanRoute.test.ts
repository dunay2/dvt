import { describe, expect, it, vi } from 'vitest';

import { compilePlanRoute } from '../../../src/entrypoints/http/compilePlanRoute.js';

import { buildCompileBody, buildStoredPlan } from './planRouteFixtures.js';
import { createCompileRequest, createReply, okAuthDeps } from './planRouteHttpTestSupport.js';

describe('compilePlanRoute', () => {
  it('returns 401 without executing CompilePlan when bearer authentication fails', async () => {
    const reply = createReply();
    const useCase = { execute: vi.fn() };
    const authDeps = okAuthDeps();
    authDeps.authenticator.authenticateBearerToken.mockResolvedValueOnce({
      ok: false,
      code: 'missing_bearer_token',
    });

    await compilePlanRoute(
      createCompileRequest({
        id: 'req-compile-no-token',
        authorization: null,
      }) as never,
      reply as never,
      { ...authDeps, useCase } as never
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({
      error: { type: 'unauthorized', reason: 'missing_bearer_token' },
    });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('returns a compiled plan without persistence side effects', async () => {
    const reply = createReply();
    const plan = buildStoredPlan();
    const useCase = { execute: vi.fn(async () => ({ plan })) };

    await compilePlanRoute(
      createCompileRequest({ id: 'req-compile-ok' }) as never,
      reply as never,
      { ...okAuthDeps(), useCase } as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      plan,
      compile: {
        persisted: false,
        executabilityValidated: false,
      },
    });
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: expect.any(Object),
        selection: {
          selectedNodeIds: ['spark-job-1'],
        },
      }),
      expect.any(Object)
    );
  });

  it('returns 400 when compile receives preview or legacy ingress fields', async () => {
    const reply = createReply();
    const useCase = { execute: vi.fn() };

    await compilePlanRoute(
      createCompileRequest({
        id: 'req-compile-forbidden-ingress',
        body: buildCompileBody({
          manifestRef: {
            uri: 'file://manifest.json',
            sha256: 'a'.repeat(64),
          },
        }),
      }) as never,
      reply as never,
      { ...okAuthDeps(), useCase } as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('contains unexpected compile failures behind the canonical 500 envelope', async () => {
    const reply = createReply();
    const logError = vi.fn();
    const useCase = {
      execute: vi.fn(async () => {
        throw new Error('planner unavailable');
      }),
    };

    await compilePlanRoute(
      createCompileRequest({ id: 'req-compile-failure', logError }) as never,
      reply as never,
      { ...okAuthDeps(), useCase } as never
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { type: 'internal_server_error', reason: 'internal_error' },
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
