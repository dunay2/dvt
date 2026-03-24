import { describe, it, expect } from 'vitest';

import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/plan-1.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'plan-1',
  planVersion: '2.0',
};

function createReply(): {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  code(status: number): unknown;
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
} {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    headers: {} as Record<string, string>,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    header(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}

describe('startRunRoute', () => {
  it('returns 400 on malformed tenantId', async () => {
    const reply = createReply();

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
    const reply = createReply();

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
    const reply = createReply();

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

  it('accepts empty selection', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, runId: 'r-empty-selection', accepted: true };
      },
    };

    await startRunRoute(
      {
        id: 'req-3b',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: [],
          graphSource: {
            kind: 'normalized-graph-v1',
            nodes: [],
          },
          runId: 'run-empty-selection',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r-empty-selection', accepted: true });
    expect(received?.command).toEqual({
      graphSource: {
        kind: 'normalized-graph-v1',
        nodes: [],
      },
      runId: 'run-empty-selection',
      targetAdapter: 'mock',
      selection: [],
    });
  });

  it('returns 400 on whitespace-only selection entries', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-3c',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['   '],
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: 'BAD_REQUEST', code: 'INVALID_SELECTION' });
  });

  it('returns 400 on blank runId', async () => {
    const reply = createReply();

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
    const reply = createReply();

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

  it('returns 400 on invalid planRef shape', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-6b',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: ['not-an-object'],
          runId: 'run-invalid-plan-ref',
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
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, runId: 'r1', accepted: true };
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
    const reply = createReply();

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

  it('accepts planner-backed starts with a typed graph source', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, runId: 'r-graph', accepted: true };
      },
    };

    await startRunRoute(
      {
        id: 'req-graph-source',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          graphSource: {
            kind: 'normalized-graph-v1',
            nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
          },
          runId: 'run-graph',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(received?.command).toEqual({
      graphSource: {
        kind: 'normalized-graph-v1',
        nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
      },
      runId: 'run-graph',
      targetAdapter: 'mock',
      selection: ['model_a'],
    });
  });

  it('returns 400 when planRef and planner source are both supplied', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-conflicting-plan-inputs',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          graphSource: {
            kind: 'normalized-graph-v1',
            nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
          },
          runId: 'run-conflict',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: 'BAD_REQUEST',
      code: 'CONFLICTING_PLAN_INPUTS',
    });
  });

  it('returns 400 when manifestRef and planRef are both supplied', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-conflicting-manifest-ref',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          manifestRef: {
            uri: 'dbt://manifest.json',
            sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          },
          runId: 'run-conflict-manifest-ref',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: 'BAD_REQUEST',
      code: 'CONFLICTING_PLAN_INPUTS',
    });
  });

  it('returns 400 when nodes and planRef are both supplied', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-conflicting-nodes',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
          runId: 'run-conflict-nodes',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: 'BAD_REQUEST',
      code: 'CONFLICTING_PLAN_INPUTS',
    });
  });

  it('returns 400 when manifest and planRef are both supplied', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-conflicting-manifest',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          manifest: { nodes: [] },
          runId: 'run-conflict-manifest',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: 'BAD_REQUEST',
      code: 'CONFLICTING_PLAN_INPUTS',
    });
  });

  it('accepts lowercase bearer scheme', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, runId: 'r2', accepted: true };
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
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return { kind: 'accepted' as const, runId: 'r3', accepted: true };
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

  it('returns 202 for duplicate idempotent retry', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return {
          kind: 'duplicate' as const,
          runId: 'run-dup',
          accepted: true,
          duplicateOf: 'intent' as const,
        };
      },
    };

    await startRunRoute(
      {
        id: 'req-dup',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-dup',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({
      runId: 'run-dup',
      accepted: true,
      duplicate: true,
      duplicateOf: 'intent',
    });
  });

  it('returns 429 with Retry-After for tenant backpressure', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return {
          kind: 'tenant_backpressure' as const,
          accepted: false,
          code: 'TENANT_BACKPRESSURE' as const,
          retryAfterSeconds: 30,
        };
      },
    };

    await startRunRoute(
      {
        id: 'req-bp-tenant',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-bp-tenant',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(429);
    expect(reply.headers).toEqual({ 'retry-after': '30' });
    expect(reply.payload).toEqual({
      error: 'TOO_MANY_REQUESTS',
      code: 'TENANT_BACKPRESSURE',
    });
  });

  it('returns 503 with Retry-After for system backpressure', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return {
          kind: 'system_backpressure' as const,
          accepted: false,
          code: 'SYSTEM_BACKPRESSURE' as const,
          retryAfterSeconds: 45,
        };
      },
    };

    await startRunRoute(
      {
        id: 'req-bp-system',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-bp-system',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(503);
    expect(reply.headers).toEqual({ 'retry-after': '45' });
    expect(reply.payload).toEqual({
      error: 'SERVICE_UNAVAILABLE',
      code: 'SYSTEM_BACKPRESSURE',
    });
  });
});
