import assert from 'node:assert/strict';
import test from 'node:test';

import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';

await test('startRunRoute returns 400 on malformed tenantId', async () => {
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

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, { error: 'BAD_REQUEST', code: 'INVALID_TENANT_ID' });
});

await test('startRunRoute returns 400 when body is missing', async () => {
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

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, { error: 'BAD_REQUEST', code: 'INVALID_BODY' });
});

await test('startRunRoute returns 400 on non-string selection items', async () => {
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

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, { error: 'BAD_REQUEST', code: 'INVALID_SELECTION' });
});

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/plan-1.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'plan-1',
  planVersion: '2.0',
};

await test('startRunRoute passes normalized command and requested scope', async () => {
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

  assert.equal(reply.statusCode, 202);
  assert.deepEqual(reply.payload, { runId: 'r1', accepted: true });
  assert.equal(received?.token, 'token');
  assert.equal(received?.requestId, 'req-2');
  assert.deepEqual(received?.command, {
    planRef: VALID_PLAN_REF,
    runId: 'run-abc',
    targetAdapter: 'mock',
    selection: ['model_a'],
  });
});

await test('startRunRoute accepts lowercase bearer scheme', async () => {
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

  assert.equal(reply.statusCode, 202);
  assert.deepEqual(reply.payload, { runId: 'r2', accepted: true });
  assert.equal(received?.token, 'token');
});
