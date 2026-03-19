import { describe, it, expect } from 'vitest';

import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/plan-1.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'plan-1',
  planVersion: '2.0',
};

describe('startRunRoute', () => {
  it('returns 400 on malformed tenantId', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-1',
        headers: {},
        body: {
          tenantId: '   ',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_TENANT_ID' });
  });

  it('returns 400 when body is missing', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-0',
        headers: {},
        body: undefined,
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_BODY' });
  });

  it('returns 400 on non-string selection items', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-3',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: [123],
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_SELECTION' });
  });

  it('returns 400 on blank runId', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-5',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: '   ',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' });
  });

  it('returns 400 on blank planRef fields', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-6',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: {
            ...VALID_PLAN_REF,
            uri: '   ',
          },
          runId: 'run-abc',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_PLAN_REF' });
  });

  it('passes normalized command and requested scope', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, result: { runId: 'r1', accepted: true } };
      },
    };

    await startRunRoute(
      {
        id: 'req-2',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: ' t1 ',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-abc',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r1', accepted: true });
    expect(received?.token).toBe('token');
    expect(received?.requestId).toBe('req-2');
    expect(received?.command).toEqual({
      planRef: VALID_PLAN_REF,
      runId: 'run-abc',
      targetAdapter: 'mock',
      selection: ['model_a'],
    });
  });

  it('returns 422 when target adapter is not configured', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const facade = {
      async execute() {
        return { kind: 'adapter_not_configured' as const, adapter: 'temporal' };
      },
    };

    await startRunRoute(
      {
        id: 'req-adapter-missing',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-adapter-missing',
          targetAdapter: 'temporal',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual({
      error: 'ADAPTER_NOT_CONFIGURED',
      adapter: 'temporal',
    });
  });

  it('accepts lowercase bearer scheme', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, result: { runId: 'r2', accepted: true } };
      },
    };

    await startRunRoute(
      {
        id: 'req-4',
        headers: { authorization: 'bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-xyz',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r2', accepted: true });
    expect(received?.token).toBe('token');
  });

  it('normalizes trim-sensitive fields', async () => {
    const reply = {
      statusCode: 200,
      payload: undefined as unknown,
      code(status: number) {
        this.statusCode = status;
        return this;
      },
      send(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, result: { runId: 'r3', accepted: true } };
      },
    };

    await startRunRoute(
      {
        id: 'req-7',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: {
            uri: ' https://plans.example.com/plan-2.json ',
            sha256: ' abc456 ',
            schemaVersion: ' 1.0.0 ',
            planId: ' plan-2 ',
            planVersion: ' 3.0 ',
          },
          runId: ' run-with-spaces ',
          targetAdapter: ' mock ',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r3', accepted: true });
    expect(received?.command).toEqual({
      planRef: {
        uri: 'https://plans.example.com/plan-2.json',
        sha256: 'abc456',
        schemaVersion: '1.0.0',
        planId: 'plan-2',
        planVersion: '3.0',
      },
      runId: 'run-with-spaces',
      targetAdapter: 'mock',
      selection: ['model_a'],
    });
  });
});
