import { describe, it, expect } from 'vitest';

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

describe('OperationalServer', () => {
  it('serves health, readiness, and metrics endpoints', async () => {
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
      expect(address).toBeTruthy();
      const baseUrl = `http://127.0.0.1:${address!.port}`;

      let response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      const initialReadyBody = (await response.json()) as { state: string; ready: boolean };
      expect(initialReadyBody.state).toBe('starting');
      expect(initialReadyBody.ready).toBe(false);

      monitor.onTick({
        claimedCount: 0,
        deliveredCount: 0,
        retriedCount: 0,
        deadLetteredCount: 0,
        oldestClaimedAgeMs: null,
        retryBacklogActive: false,
      });

      response = await globalThis.fetch(`${baseUrl}/healthz`);
      expect(response.status).toBe(200);
      const healthBody = (await response.json()) as { state: string; ok: boolean };
      expect(healthBody.state).toBe('idle');
      expect(healthBody.ok).toBe(true);

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(200);

      const metricsResponse = await globalThis.fetch(`${baseUrl}/metrics`);
      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.text();
      expect(metrics).toMatch(/dvt_outbox_runtime_ready 1/);
      expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="idle"\} 1/);
    } finally {
      await server.stop();
    }
  });

  it('stop does not mask listen failures', async () => {
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
    expect(address).toBeTruthy();

    const second = createOperationalServer({
      host: '127.0.0.1',
      port: address!.port,
      logger: makeLogger(),
      monitor: new OutboxWorkerMonitor({
        serviceName: 'dvt-outbox-worker',
        logger: makeLogger(),
        nowMs: () => 1_741_392_000_000,
      }),
    });

    try {
      await expect(() => second.start()).rejects.toThrow(/EADDRINUSE/);
      await second.stop();
    } finally {
      await second.stop();
      await first.stop();
    }
  });

  it('reflects failing and stopped states in probes', async () => {
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
      expect(address).toBeTruthy();
      const baseUrl = `http://127.0.0.1:${address!.port}`;

      monitor.onError(new Error('synthetic runtime failure'));

      let response = await globalThis.fetch(`${baseUrl}/healthz`);
      expect(response.status).toBe(200);
      const failingHealthBody = (await response.json()) as { state: string; ok: boolean };
      expect(failingHealthBody.state).toBe('failing');
      expect(failingHealthBody.ok).toBe(true);

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      const readyBody = (await response.json()) as {
        state: string;
        ready: boolean;
        lastErrorMessage: string | null;
      };
      expect(readyBody.state).toBe('failing');
      expect(readyBody.ready).toBe(false);
      expect(readyBody.lastErrorMessage).toBe('synthetic runtime failure');

      monitor.onStopped();

      response = await globalThis.fetch(`${baseUrl}/healthz`);
      expect(response.status).toBe(503);
      const stoppedHealthBody = (await response.json()) as { state: string; ok: boolean };
      expect(stoppedHealthBody.state).toBe('stopped');
      expect(stoppedHealthBody.ok).toBe(false);

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      const stoppedBody = (await response.json()) as {
        state: string;
        ready: boolean;
        ok: boolean;
      };
      expect(stoppedBody.state).toBe('stopped');
      expect(stoppedBody.ready).toBe(false);
      expect(stoppedBody.ok).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it('reflects passive ownership as healthy but not ready', async () => {
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
      expect(address).toBeTruthy();
      const baseUrl = `http://127.0.0.1:${address!.port}`;

      monitor.enterPassiveMode();

      let response = await globalThis.fetch(`${baseUrl}/healthz`);
      expect(response.status).toBe(200);
      const healthBody = (await response.json()) as { state: string; ok: boolean };
      expect(healthBody.state).toBe('passive');
      expect(healthBody.ok).toBe(true);

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      const readyBody = (await response.json()) as {
        state: string;
        ready: boolean;
        owner: boolean;
      };
      expect(readyBody.state).toBe('passive');
      expect(readyBody.ready).toBe(false);
      expect(readyBody.owner).toBe(false);

      const metricsResponse = await globalThis.fetch(`${baseUrl}/metrics`);
      const metrics = await metricsResponse.text();
      expect(metrics).toMatch(/dvt_outbox_runtime_owner 0/);
      expect(metrics).toMatch(/dvt_outbox_runtime_ready 0/);
      expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="passive"\} 1/);
    } finally {
      await server.stop();
    }
  });

  it('exposes effective owner state in readiness probes', async () => {
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
      expect(address).toBeTruthy();
      const baseUrl = `http://127.0.0.1:${address!.port}`;

      monitor.onOwnershipAcquired();

      let response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      let readyBody = (await response.json()) as { state: string; ready: boolean; owner: boolean };
      expect(readyBody.state).toBe('starting');
      expect(readyBody.ready).toBe(false);
      expect(readyBody.owner).toBe(true);

      monitor.enterPassiveMode();

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      readyBody = (await response.json()) as { state: string; ready: boolean; owner: boolean };
      expect(readyBody.state).toBe('passive');
      expect(readyBody.owner).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it('withdraws readiness when the last tick becomes stale', async () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger: makeLogger(),
      nowMs: () => clock.nowMs,
      readyStaleAfterMs: 5_000,
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
      expect(address).toBeTruthy();
      const baseUrl = `http://127.0.0.1:${address!.port}`;

      monitor.onStarted();
      monitor.onTick({
        claimedCount: 0,
        deliveredCount: 0,
        retriedCount: 0,
        deadLetteredCount: 0,
        oldestClaimedAgeMs: null,
        retryBacklogActive: false,
      });

      let response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(200);

      clock.nowMs += 5_001;

      response = await globalThis.fetch(`${baseUrl}/readyz`);
      expect(response.status).toBe(503);
      const readyBody = (await response.json()) as {
        state: string;
        ready: boolean;
        tickFresh: boolean;
      };
      expect(readyBody.state).toBe('idle');
      expect(readyBody.ready).toBe(false);
      expect(readyBody.tickFresh).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it('start and stop are idempotent and reset the bound address', async () => {
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

    expect(server.getAddress()).toBe(null);

    await server.start();
    const firstAddress = server.getAddress();
    expect(firstAddress).toBeTruthy();

    await server.start();
    expect(server.getAddress()).toEqual(firstAddress);

    await server.stop();
    expect(server.getAddress()).toBe(null);

    await server.stop();
    expect(server.getAddress()).toBe(null);
  });
});
