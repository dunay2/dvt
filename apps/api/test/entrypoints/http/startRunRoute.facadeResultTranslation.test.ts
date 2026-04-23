import { describe, expect, it } from 'vitest';

import {
  httpError,
  invokeStartRunRoute,
  okResult,
  VALID_BODY,
} from './startRunRoute.test.support.js';

describe('startRunRoute facade result translation', () => {
  it('returns 422 missing_capability when facade rejects a plan for adapter capabilities', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-plan-missing-capability',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          runId: 'run-plan-missing-capability',
        },
      },
      facade: {
        async execute() {
          return okResult({
            kind: 'plan_rejected' as const,
            accepted: false,
            code: 'MISSING_CAPABILITY' as const,
            reason: 'Missing adapter capability: workflow.pause',
            cause: 'workflow.pause',
          });
        },
      },
    });

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'missing_capability', {
        details: {
          message: 'Missing adapter capability: workflow.pause',
          cause: 'workflow.pause',
        },
      })
    );
  });

  it('returns 429 with Retry-After for tenant backpressure', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-bp-tenant',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          runId: 'run-bp-tenant',
        },
      },
      facade: {
        async execute() {
          return okResult({
            kind: 'tenant_backpressure' as const,
            accepted: false,
            code: 'TENANT_BACKPRESSURE' as const,
            retryAfterSeconds: 30,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(429);
    expect(reply.headers).toEqual({ 'retry-after': '30' });
    expect(reply.payload).toEqual(httpError('rate_limited', 'tenant_backpressure'));
  });

  it('returns 503 with Retry-After for system backpressure', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-bp-system',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          runId: 'run-bp-system',
        },
      },
      facade: {
        async execute() {
          return okResult({
            kind: 'system_backpressure' as const,
            accepted: false,
            code: 'SYSTEM_BACKPRESSURE' as const,
            retryAfterSeconds: 45,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(503);
    expect(reply.headers).toEqual({ 'retry-after': '45' });
    expect(reply.payload).toEqual(httpError('service_unavailable', 'system_backpressure'));
  });
});
