import { describe, it, expect } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunContract.js';
import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/plan-1.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'plan-1',
  planVersion: '2.0',
};

function okResult<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

function errorResult<T>(error: T): { readonly ok: false; readonly error: T } {
  return { ok: false, error };
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

function registryWith(...supported: Array<'mock' | 'temporal'>): {
  isSupported(value: string): value is 'mock' | 'temporal';
  listSupported(): ReadonlyArray<'mock' | 'temporal'>;
} {
  return {
    isSupported(value: string): value is 'mock' | 'temporal' {
      return supported.includes(value as 'mock' | 'temporal');
    },
    listSupported() {
      return [...supported];
    },
  };
}

describe('startRunRoute', () => {
  it('returns 400 when tenantId is missing', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-missing-tenant',
        headers: {},
        body: {
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(
      httpError('bad_request', 'missing_tenant_id', { target: 'tenantId' })
    );
  });

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
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_tenant_id', { target: 'tenantId' })
    );
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
    expect(reply.payload).toEqual(httpError('bad_request', 'invalid_body'));
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
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_selection', { target: 'selection' })
    );
  });

  it('accepts empty selection when graph source contains nodes', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r-empty-selection', accepted: true });
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
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
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
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
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
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_selection', { target: 'selection' })
    );
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
    expect(reply.payload).toEqual(httpError('bad_request', 'invalid_run_id', { target: 'runId' }));
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
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_plan_ref', { target: 'planRef' })
    );
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
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_plan_ref', { target: 'planRef' })
    );
  });

  it('passes normalized command and requested scope', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r1', accepted: true });
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

  it('returns 401 when facade returns ok=true unauthenticated', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return okResult({ kind: 'unauthenticated' as const, code: 'MISSING_TOKEN' as const });
      },
    };

    await startRunRoute(
      {
        id: 'req-unauthenticated',
        headers: {},
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-unauthenticated',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual(httpError('unauthorized', 'missing_token'));
  });

  it('returns 403 when facade returns ok=true unauthorized', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return okResult({ kind: 'unauthorized' as const, reason: 'TENANT_NOT_GRANTED' as const });
      },
    };

    await startRunRoute(
      {
        id: 'req-unauthorized',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-unauthorized',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual(httpError('forbidden', 'tenant_not_granted'));
  });

  it('returns 422 when engine reports adapter_not_registered', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return errorResult({ kind: 'adapter_not_registered' as const, adapter: 'temporal' });
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
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'adapter_not_configured', { details: { adapter: 'temporal' } })
    );
  });

  it('returns 400 when target adapter is not available in runtime registry', async () => {
    const reply = createReply();
    const facade = {
      async execute() {
        throw new Error('should not be called');
      },
    };

    await startRunRoute(
      {
        id: 'req-adapter-unavailable',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-adapter-unavailable',
          targetAdapter: 'temporal',
        },
      } as never,
      reply as never,
      facade as never,
      registryWith('mock') as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_target_adapter', { target: 'targetAdapter' })
    );
  });

  it('returns 422 plan_rejected when engine reports command_invalid', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return errorResult({
          kind: 'command_invalid' as const,
          code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
          reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
        });
      },
    };

    await startRunRoute(
      {
        id: 'req-command-invalid',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-command-invalid',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'plan_rejected', {
        details: {
          message: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          cause: 'plan_ref_required',
        },
      })
    );
  });

  it('returns 422 plan_rejected when engine reports unsupported_plan_version', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return errorResult({
          kind: 'unsupported_plan_version' as const,
          planVersion: '2.7',
          supportedVersions: ['1.0'] as const,
        });
      },
    };

    await startRunRoute(
      {
        id: 'req-unsupported-plan-version',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-unsupported-plan-version',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'unsupported_plan_version', {
        details: {
          message: 'Unsupported plan version: 2.7',
          supportedVersions: ['1.0'],
        },
      })
    );
  });

  it('returns 422 missing_capability when facade rejects a plan for adapter capabilities', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return okResult({
          kind: 'plan_rejected' as const,
          accepted: false,
          code: 'MISSING_CAPABILITY' as const,
          reason: 'Missing adapter capability: workflow.pause',
          cause: 'workflow.pause',
        });
      },
    };

    await startRunRoute(
      {
        id: 'req-plan-missing-capability',
        headers: { authorization: 'Bearer token' },
        body: {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: ['model_a'],
          planRef: VALID_PLAN_REF,
          runId: 'run-plan-missing-capability',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

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

  it('accepts planner-backed starts with a typed graph source', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r-graph', accepted: true });
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
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
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
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
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
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
          runId: 'run-conflict',
          targetAdapter: 'mock',
        },
      } as never,
      reply as never,
      facade as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(httpError('bad_request', 'conflicting_plan_inputs'));
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
    expect(reply.payload).toEqual(httpError('bad_request', 'conflicting_plan_inputs'));
  });

  it('returns 400 when legacy nodes payload is supplied', async () => {
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
    expect(reply.payload).toEqual(httpError('bad_request', 'invalid_plan_source'));
  });

  it('returns 400 when legacy manifest payload is supplied', async () => {
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
    expect(reply.payload).toEqual(httpError('bad_request', 'invalid_plan_source'));
  });

  it('accepts lowercase bearer scheme', async () => {
    const reply = createReply();

    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r2', accepted: true });
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
        return okResult({ kind: 'accepted' as const, runId: 'r3', accepted: true });
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
        return okResult({
          kind: 'duplicate' as const,
          runId: 'run-dup',
          accepted: true,
          duplicateOf: 'intent' as const,
        });
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
        return okResult({
          kind: 'tenant_backpressure' as const,
          accepted: false,
          code: 'TENANT_BACKPRESSURE' as const,
          retryAfterSeconds: 30,
        });
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
    expect(reply.payload).toEqual(httpError('rate_limited', 'tenant_backpressure'));
  });

  it('returns 503 with Retry-After for system backpressure', async () => {
    const reply = createReply();

    const facade = {
      async execute() {
        return okResult({
          kind: 'system_backpressure' as const,
          accepted: false,
          code: 'SYSTEM_BACKPRESSURE' as const,
          retryAfterSeconds: 45,
        });
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
    expect(reply.payload).toEqual(httpError('service_unavailable', 'system_backpressure'));
  });
});
