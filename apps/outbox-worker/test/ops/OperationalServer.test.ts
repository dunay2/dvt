import assert from 'node:assert/strict';
import test from 'node:test';

import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';

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
    let body = (await response.json()) as { state: string; ready: boolean };
    assert.equal(body.state, 'starting');
    assert.equal(body.ready, false);

    monitor.onTick({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: null,
    });

    response = await globalThis.fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    body = (await response.json()) as { state: string; ok: boolean };
    assert.equal(body.state, 'idle');
    assert.equal(body.ok, true);

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
