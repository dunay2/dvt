import { createNoopObservability, type ISpan } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import {
  httpError,
  invokeStartRunRoute,
  okResult,
  VALID_BODY,
  VALID_GENERATED_RUN_ID,
  VALID_PLAN_REF,
} from './startRunRoute.test.support.js';

describe('startRunRoute auth, success, and transport failure outcomes', () => {
  it('contains unexpected infrastructure failures behind the stable HTTP error envelope', async () => {
    const infrastructureMessage = 'connect ETIMEDOUT postgres.internal:5432';
    const recordStartRunLatency = vi.fn();

    const { reply } = await invokeStartRunRoute({
      useCase: {
        async execute() {
          throw new Error(infrastructureMessage);
        },
      },
      telemetry: { recordStartRunLatency },
    });

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual(httpError('internal_server_error', 'internal_error'));
    expect(JSON.stringify(reply.payload)).not.toContain(infrastructureMessage);
    expect(recordStartRunLatency).toHaveBeenCalledWith(expect.any(Number), 'exception');
  });

  it('accepts a StartRun request with explicitly injected disabled observability', async () => {
    const { reply } = await invokeStartRunRoute({
      observability: createNoopObservability(),
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: VALID_GENERATED_RUN_ID, accepted: true });
  });

  it('bounds an accepted request with the governed StartRun HTTP span', async () => {
    const span = createTrackingSpan();
    const withSpan = vi.fn((_name, _options, run) => run(span));

    const { reply } = await invokeStartRunRoute({
      observability: {
        ...createNoopObservability(),
        traces: {
          ...createNoopObservability().traces,
          withSpan,
        },
      },
    });

    expect(reply.statusCode).toBe(202);
    expect(withSpan).toHaveBeenCalledWith(
      'api.startRun',
      {
        attributes: {
          method: 'POST',
          operation: 'startRun',
          route: '/runs/start',
        },
      },
      expect.any(Function)
    );
    expect(span.setAttribute).toHaveBeenCalledWith('provider', 'temporal');
    expect(span.setAttributes).toHaveBeenCalledWith({
      'http.response.status_code': 202,
      outcome: 'accepted',
    });
    expect(span.setStatus).toHaveBeenCalledWith('ok');
  });

  it('records authorization rejection on the HTTP span without treating it as a runtime failure', async () => {
    const span = createTrackingSpan();

    const { reply } = await invokeStartRunRoute({
      authorizer: {
        async authorize() {
          return { ok: false as const, reason: 'TENANT_NOT_GRANTED' as const };
        },
      },
      observability: {
        ...createNoopObservability(),
        traces: {
          ...createNoopObservability().traces,
          withSpan: (_name, _options, run) => run(span),
        },
      },
    });

    expect(reply.statusCode).toBe(403);
    expect(span.setAttributes).toHaveBeenCalledWith({
      'http.response.status_code': 403,
      outcome: 'rejected',
    });
    expect(span.setStatus).toHaveBeenCalledWith('ok');
  });

  it('passes normalized command and requested scope', async () => {
    let receivedCommand: Record<string, unknown> | undefined;
    let receivedContext: unknown;
    const useCase = {
      async execute(command: Record<string, unknown>, context: unknown) {
        receivedCommand = command;
        receivedContext = context;
        return okResult({
          kind: 'accepted' as const,
          runId: VALID_GENERATED_RUN_ID,
          accepted: true,
        });
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
      useCase,
      runIdGenerator: () => VALID_GENERATED_RUN_ID,
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: VALID_GENERATED_RUN_ID, accepted: true });
    expect(receivedCommand).toEqual({
      planRef: VALID_PLAN_REF,
      runId: VALID_GENERATED_RUN_ID,
      targetAdapter: 'temporal',
      selection: { mode: 'explicit', nodeIds: ['model_a'] },
    });
    expect(receivedContext).toMatchObject({
      scope: {
        resource: 'environment',
        tenantId: expect.objectContaining({ value: 't1' }),
        projectId: expect.objectContaining({ value: 'p1' }),
        environmentId: expect.objectContaining({ value: 'e1' }),
      },
      action: { kind: 'command', name: 'run:start' },
      requestId: 'req-normalized',
    });
  });

  it('accepts lowercase bearer scheme', async () => {
    const authenticateBearerToken = vi.fn().mockResolvedValue({
      ok: false as const,
      code: 'INVALID_TOKEN' as const,
    });

    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-bearer-lowercase',
        headers: { authorization: 'bearer token' },
        body: VALID_BODY,
      },
      authenticator: { authenticateBearerToken },
    });

    expect(reply.statusCode).toBe(401);
    expect(authenticateBearerToken).toHaveBeenCalledWith('token');
  });

  it('returns 401 when shared authentication rejects the request', async () => {
    const recordStartRunLatency = vi.fn();
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-unauthenticated',
        body: VALID_BODY,
      },
      authenticator: {
        async authenticateBearerToken() {
          return { ok: false as const, code: 'MISSING_TOKEN' as const };
        },
      },
      telemetry: { recordStartRunLatency },
    });

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual(httpError('unauthorized', 'missing_token'));
    expect(recordStartRunLatency).toHaveBeenCalledWith(expect.any(Number), 'unauthenticated');
  });

  it('returns 403 when shared authorization rejects the request', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-unauthorized',
        headers: { authorization: 'Bearer token' },
        body: VALID_BODY,
      },
      authorizer: {
        async authorize() {
          return { ok: false as const, reason: 'TENANT_NOT_GRANTED' as const };
        },
      },
    });

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual(httpError('forbidden', 'tenant_not_granted'));
  });

  it('returns 202 for duplicate idempotent retry', async () => {
    const recordStartRunLatency = vi.fn();
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-duplicate',
        headers: { authorization: 'Bearer token' },
        body: VALID_BODY,
      },
      useCase: {
        async execute() {
          return okResult({
            kind: 'duplicate' as const,
            runId: 'run-dup',
            accepted: true,
            duplicateOf: 'intent' as const,
          });
        },
      },
      telemetry: { recordStartRunLatency },
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({
      runId: 'run-dup',
      accepted: true,
      duplicate: true,
      duplicateOf: 'intent',
    });
    expect(recordStartRunLatency).toHaveBeenCalledWith(expect.any(Number), 'duplicate');
  });
});

function createTrackingSpan(): ISpan {
  return {
    end: vi.fn(),
    recordException: vi.fn(),
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
  };
}
