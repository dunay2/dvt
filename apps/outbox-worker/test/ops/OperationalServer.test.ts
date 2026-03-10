import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

await test('OperationalServer serves health, readiness, and metrics endpoints', async () => {
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger: makeLogger(),
    nowMs: () => 1_741_392_000_000,
  });

  const server = createOperationalServer({
    host: '127.0.0.1',
    port: 0,
    logger: makeLogger(),
    monitor,
  });

  await server.start();

  try {
    const address = server.getAddress();
    assert.ok(address);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    let response = await globalThis.fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 503);
    const initialReadyBody = (await response.json()) as { state: string; ready: boolean };
    assert.equal(initialReadyBody.state, 'starting');
    assert.equal(initialReadyBody.ready, false);

    monitor.onTick({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: null,
      retryBacklogActive: false,
    });

    response = await globalThis.fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    const healthBody = (await response.json()) as { state: string; ok: boolean };
    assert.equal(healthBody.state, 'idle');
    assert.equal(healthBody.ok, true);

    response = await globalThis.fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 200);

    const metricsResponse = await globalThis.fetch(`${baseUrl}/metrics`);
    assert.equal(metricsResponse.status, 200);
    const metrics = await metricsResponse.text();
    assert.match(metrics, /dvt_outbox_runtime_ready 1/);
    assert.match(metrics, /dvt_outbox_runtime_state\{state="idle"\} 1/);
  } finally {
    await server.stop();
  }
});

await test('OperationalServer stop does not mask listen failures', async () => {
  const first = createOperationalServer({
    host: '127.0.0.1',
    port: 0,
    logger: makeLogger(),
    monitor: new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger: makeLogger(),
      nowMs: () => 1_741_392_000_000,
    }),
  });

  await first.start();

  const address = first.getAddress();
  assert.ok(address);

  const second = createOperationalServer({
    host: '127.0.0.1',
    port: address.port,
    logger: makeLogger(),
    monitor: new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger: makeLogger(),
      nowMs: () => 1_741_392_000_000,
    }),
  });

  try {
    await assert.rejects(() => second.start(), /EADDRINUSE/);
    await second.stop();
  } finally {
    await second.stop();
    await first.stop();
  }
});

await test('OperationalServer reflects failing and stopped states in probes', async () => {
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger: makeLogger(),
    nowMs: () => 1_741_392_000_000,
  });
  const server = createOperationalServer({
    host: '127.0.0.1',
    port: 0,
    logger: makeLogger(),
    monitor,
  });

  await server.start();

  try {
    const address = server.getAddress();
    assert.ok(address);
    const baseUrl = `http://127.0.0.1:${address.port}`;

    monitor.onError(new Error('synthetic runtime failure'));

    let response = await globalThis.fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    const failingHealthBody = (await response.json()) as { state: string; ok: boolean };
    assert.equal(failingHealthBody.state, 'failing');
    assert.equal(failingHealthBody.ok, true);

    response = await globalThis.fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 503);
    const readyBody = (await response.json()) as {
      state: string;
      ready: boolean;
      lastErrorMessage: string | null;
    };
    assert.equal(readyBody.state, 'failing');
    assert.equal(readyBody.ready, false);
    assert.equal(readyBody.lastErrorMessage, 'synthetic runtime failure');

    monitor.onStopped();

    response = await globalThis.fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 503);
    const stoppedHealthBody = (await response.json()) as { state: string; ok: boolean };
    assert.equal(stoppedHealthBody.state, 'stopped');
    assert.equal(stoppedHealthBody.ok, false);

    response = await globalThis.fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 503);
    const stoppedBody = (await response.json()) as { state: string; ready: boolean; ok: boolean };
    assert.equal(stoppedBody.state, 'stopped');
    assert.equal(stoppedBody.ready, false);
    assert.equal(stoppedBody.ok, false);
  } finally {
    await server.stop();
  }
});

await test('OperationalServer start and stop are idempotent and reset the bound address', async () => {
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger: makeLogger(),
    nowMs: () => 1_741_392_000_000,
  });
  const server = createOperationalServer({
    host: '127.0.0.1',
    port: 0,
    logger: makeLogger(),
    monitor,
  });

  assert.equal(server.getAddress(), null);

  await server.start();
  const firstAddress = server.getAddress();
  assert.ok(firstAddress);

  await server.start();
  assert.deepEqual(server.getAddress(), firstAddress);

  await server.stop();
  assert.equal(server.getAddress(), null);

  await server.stop();
  assert.equal(server.getAddress(), null);
});
