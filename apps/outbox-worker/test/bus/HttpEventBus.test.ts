import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import type { RunEventPersisted } from '@dvt/engine';

import { HttpEventBus } from '../../src/bus/HttpEventBus.js';

function makeEvent(id: string): RunEventPersisted {
  return {
    eventId: `evt-${id}`,
    eventType: 'RunQueued',
    runId: 'run-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-08T00:00:00.000Z',
    idempotencyKey: `key-${id}`,
    runSeq: 1,
    persistedAt: '2026-03-08T00:00:00.000Z',
  };
}

await test('HttpEventBus posts events to the configured downstream endpoint', async () => {
  let receivedAuthorization: string | undefined;
  let receivedBody = '';

  const server = createServer((request, response) => {
    receivedAuthorization = request.headers.authorization;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      receivedBody += chunk;
    });
    request.on('end', () => {
      response.writeHead(202, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const bus = new HttpEventBus({
      targetUrl: `http://127.0.0.1:${address.port}/outbox/events`,
      timeoutMs: 1000,
      bearerToken: 'secret-token',
      serviceName: 'dvt-outbox-worker-test',
    });

    await bus.publish([makeEvent('1')]);

    assert.equal(receivedAuthorization, 'Bearer secret-token');
    assert.deepEqual(JSON.parse(receivedBody), { events: [makeEvent('1')] });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

await test('HttpEventBus cancels successful response bodies after publish', async () => {
  let cancelCalls = 0;

  const bus = new HttpEventBus({
    targetUrl: 'http://example.test/outbox/events',
    fetchImpl: (async () =>
      ({
        ok: true,
        status: 202,
        body: {
          cancel: async (): Promise<void> => {
            cancelCalls += 1;
          },
        },
      }) as globalThis.Response) as typeof globalThis.fetch,
  });

  await bus.publish([makeEvent('1')]);

  assert.equal(cancelCalls, 1);
});

await test('HttpEventBus rejects non-success downstream responses', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'unavailable' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const bus = new HttpEventBus({
      targetUrl: `http://127.0.0.1:${address.port}/outbox/events`,
      timeoutMs: 1000,
    });

    await assert.rejects(() => bus.publish([makeEvent('1')]), /HTTP_EVENT_BUS_BAD_STATUS: 503/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

await test('HttpEventBus times out when downstream does not respond', async () => {
  const server = createServer(() => {
    // Intentionally never respond to exercise bounded publish timeout.
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const bus = new HttpEventBus({
      targetUrl: `http://127.0.0.1:${address.port}/outbox/events`,
      timeoutMs: 50,
    });

    await assert.rejects(() => bus.publish([makeEvent('1')]), /HTTP_EVENT_BUS_TIMEOUT: 50/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
