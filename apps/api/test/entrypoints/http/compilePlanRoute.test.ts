import { describe, expect, it, vi } from 'vitest';

import { compilePlanRoute } from '../../../src/entrypoints/http/compilePlanRoute.js';

import {
  buildCompileBody,
  buildTransformationStoredPlan,
} from './planRouteFixtures.js';
import { createCompileRequest, createReply, okAuthDeps } from './planRouteHttpTestSupport.js';

describe('compilePlanRoute', () => {
  it('returns a compiled plan without persistence side effects', async () => {
    const reply = createReply();
    const plan = buildTransformationStoredPlan();
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
          selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
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
});
