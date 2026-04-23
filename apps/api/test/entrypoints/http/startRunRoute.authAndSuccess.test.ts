import { describe, expect, it } from 'vitest';

import {
  httpError,
  invokeStartRunRoute,
  okResult,
  VALID_BODY,
  VALID_PLAN_REF,
} from './startRunRoute.test.support.js';

describe('startRunRoute auth and success outcomes', () => {
  it('passes normalized command and requested scope', async () => {
    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r1', accepted: true });
      },
    };

    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-normalized',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          tenantId: ' t1 ',
          planRef: VALID_PLAN_REF,
        },
      },
      facade,
      runIdGenerator: () => 'run_generated_success',
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r1', accepted: true });
    expect(received).toEqual({
      token: 'token',
      requestId: 'req-normalized',
      command: {
        planRef: VALID_PLAN_REF,
        runId: 'run_generated_success',
        targetAdapter: 'mock',
        selection: { mode: 'explicit', nodeIds: ['model_a'] },
      },
      requestedScope: {
        resource: 'environment',
        tenantId: expect.objectContaining({ value: 't1' }),
        projectId: expect.objectContaining({ value: 'p1' }),
        environmentId: expect.objectContaining({ value: 'e1' }),
        action: { kind: 'command', name: 'run:start' },
      },
    });
  });

  it('accepts lowercase bearer scheme', async () => {
    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r2', accepted: true });
      },
    };

    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-bearer-lowercase',
        headers: { authorization: 'bearer token' },
        body: VALID_BODY,
      },
      facade,
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r2', accepted: true });
    expect(received?.token).toBe('token');
  });

  it('returns 401 when facade returns ok=true unauthenticated', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-unauthenticated',
        body: VALID_BODY,
      },
      facade: {
        async execute() {
          return okResult({ kind: 'unauthenticated' as const, code: 'MISSING_TOKEN' as const });
        },
      },
    });

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual(httpError('unauthorized', 'missing_token'));
  });

  it('returns 403 when facade returns ok=true unauthorized', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-unauthorized',
        headers: { authorization: 'Bearer token' },
        body: VALID_BODY,
      },
      facade: {
        async execute() {
          return okResult({
            kind: 'unauthorized' as const,
            reason: 'TENANT_NOT_GRANTED' as const,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual(httpError('forbidden', 'tenant_not_granted'));
  });

  it('returns 202 for duplicate idempotent retry', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-duplicate',
        headers: { authorization: 'Bearer token' },
        body: VALID_BODY,
      },
      facade: {
        async execute() {
          return okResult({
            kind: 'duplicate' as const,
            runId: 'run-dup',
            accepted: true,
            duplicateOf: 'intent' as const,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({
      runId: 'run-dup',
      accepted: true,
      duplicate: true,
      duplicateOf: 'intent',
    });
  });
});
