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

await test('HttpEventBus does not let successful response cleanup failures mask publish success', async () => {
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
            throw new Error('synthetic cancel failure');
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

await test('HttpEventBus surfaces network failures without rewriting them as timeouts', async () => {
  const bus = new HttpEventBus({
    targetUrl: 'http://example.test/outbox/events',
    timeoutMs: 1_000,
    fetchImpl: (async () => {
      throw new Error('synthetic network failure');
    }) as typeof globalThis.fetch,
  });

  await assert.rejects(
    () => bus.publish([makeEvent('1')]),
    (error: unknown) =>
      error instanceof Error &&
      error.message !== 'HTTP_EVENT_BUS_TIMEOUT: 1000' &&
      error.message === 'synthetic network failure'
  );
});

await test('HttpEventBus does not let response cleanup mask downstream failures', async () => {
  let cancelCalls = 0;

  const bus = new HttpEventBus({
    targetUrl: 'http://example.test/outbox/events',
    fetchImpl: (async () =>
      ({
        ok: false,
        status: 503,
        body: {
          cancel: async (): Promise<void> => {
            cancelCalls += 1;
            throw new Error('synthetic cancel failure');
          },
        },
      }) as globalThis.Response) as typeof globalThis.fetch,
  });

  await assert.rejects(() => bus.publish([makeEvent('1')]), /HTTP_EVENT_BUS_BAD_STATUS: 503/);
  assert.equal(cancelCalls, 1);
});

await test('HttpEventBus aborts an in-flight publish on shutdown interruption', async () => {
  let abortsObserved = 0;
  let fetchStarted = false;

  const bus = new HttpEventBus({
    targetUrl: 'http://example.test/outbox/events',
    timeoutMs: 60_000,
    fetchImpl: (async (_url, init) => {
      fetchStarted = true;
      const signal = init?.signal;

      return new Promise<globalThis.Response>((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => {
            abortsObserved += 1;
            reject(makeAbortError());
          },
          { once: true }
        );
      });
    }) as typeof globalThis.fetch,
  });

  const pendingPublish = bus.publish([makeEvent('1')]);
  await waitFor(() => fetchStarted);

  bus.abortPendingPublishes();

  await assert.rejects(pendingPublish, /HTTP_EVENT_BUS_TIMEOUT: 60000/);
  assert.equal(abortsObserved, 1);
});

await test('HttpEventBus aborts all in-flight publishes on shutdown interruption', async () => {
  let abortsObserved = 0;
  let fetchStarted = 0;

  const bus = new HttpEventBus({
    targetUrl: 'http://example.test/outbox/events',
    timeoutMs: 60_000,
    fetchImpl: (async (_url, init) => {
      fetchStarted += 1;
      const signal = init?.signal;

      return new Promise<globalThis.Response>((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => {
            abortsObserved += 1;
            reject(makeAbortError());
          },
          { once: true }
        );
      });
    }) as typeof globalThis.fetch,
  });

  const firstPublish = bus.publish([makeEvent('1')]);
  const secondPublish = bus.publish([makeEvent('2')]);
  await waitFor(() => fetchStarted === 2);

  bus.abortPendingPublishes();

  await assert.rejects(firstPublish, /HTTP_EVENT_BUS_TIMEOUT: 60000/);
  await assert.rejects(secondPublish, /HTTP_EVENT_BUS_TIMEOUT: 60000/);
  assert.equal(abortsObserved, 2);
});

function makeAbortError(): Error {
  const error = new Error('synthetic abort');
  Object.defineProperty(error, 'name', {
    value: 'AbortError',
    configurable: true,
  });
  return error;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
  }
}
