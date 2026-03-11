import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { runOutboxWorkerHost } from '../../src/host/runOutboxWorkerHost.js';
import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import { loadEnv, type ActiveEnv } from '../../src/plugins/env.js';
import type { CreateOutboxWorkerRuntimeOptions } from '../../src/runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

function makeLogger(): {
  logger: OutboxWorkerRuntimeLogger;
  entries: Array<{ level: 'info' | 'warn' | 'error'; msg?: string; data: Record<string, unknown> }>;
} {
  const entries: Array<{
    level: 'info' | 'warn' | 'error';
    msg?: string;
    data: Record<string, unknown>;
  }> = [];

  return {
    logger: {
      info(data, msg) {
        entries.push(msg === undefined ? { level: 'info', data } : { level: 'info', data, msg });
      },
      warn(data, msg) {
        entries.push(msg === undefined ? { level: 'warn', data } : { level: 'warn', data, msg });
      },
      error(data, msg) {
        entries.push(msg === undefined ? { level: 'error', data } : { level: 'error', data, msg });
      },
    },
    entries,
  };
}

class AbortDuringListenerRegistrationSignal {
  private abortedState = false;

  get aborted(): boolean {
    return this.abortedState;
  }

  addEventListener(type: unknown): void {
    if (type !== 'abort') {
      return;
    }
    this.abortedState = true;
  }

  removeEventListener(type: unknown): void {
    if (type === 'abort') {
      return;
    }
  }
}

await test('runOutboxWorkerHost keeps passive mode observable without creating the runtime', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
  });
  const shutdown = new globalThis.AbortController();
  shutdown.abort();

  await runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
      },
      stop: async () => {
        calls.push('operational.stop');
      },
    },
    shutdownSignal: shutdown.signal,
    createRuntime: async () => {
      calls.push('runtime.factory');
      throw new Error('runtime should not be created in passive mode');
    },
  });

  const snapshot = monitor.getHealthSnapshot();
  assert.deepEqual(calls, ['operational.start', 'operational.stop']);
  assert.equal(snapshot.state, 'passive');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.ready, false);
  assert.equal(
    entries.some((entry) => entry.msg === 'outbox worker bootstrapped'),
    true
  );
});

await test('runOutboxWorkerHost creates and starts the runtime when ownership mode is active', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const shutdown = new globalThis.AbortController();
  let receivedObserver: CreateOutboxWorkerRuntimeOptions['observer'];
  let receivedHooks: CreateOutboxWorkerRuntimeOptions['hooks'];
  let receivedShutdownSignal: CreateOutboxWorkerRuntimeOptions['shutdownSignal'];
  let receivedSignal: globalThis.AbortSignal | null = null;

  await runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
      },
      stop: async () => {
        calls.push('operational.stop');
      },
    },
    shutdownSignal: shutdown.signal,
    createRuntime: async (
      runtimeEnv: ActiveEnv,
      runtimeLogger,
      runtimeOptions: CreateOutboxWorkerRuntimeOptions = {}
    ) => {
      calls.push('runtime.factory');
      receivedObserver = runtimeOptions.observer;
      receivedHooks = runtimeOptions.hooks;
      receivedShutdownSignal = runtimeOptions.shutdownSignal;
      assert.equal(runtimeEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
      assert.equal(runtimeEnv.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
      assert.equal(runtimeLogger, logger);

      return {
        start: async (signal?: globalThis.AbortSignal) => {
          calls.push('runtime.start');
          receivedSignal = signal ?? null;
        },
        stop: async () => {
          calls.push('runtime.stop');
        },
      };
    },
  });

  assert.deepEqual(calls, [
    'operational.start',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
  ]);
  assert.equal(receivedSignal, shutdown.signal);
  assert.equal(receivedObserver, monitor);
  assert.equal(receivedHooks, monitor);
  assert.equal(receivedShutdownSignal, shutdown.signal);
  assert.equal(
    entries.some((entry) => entry.msg === 'outbox worker bootstrapped'),
    true
  );
});

await test('runOutboxWorkerHost skips active runtime bootstrap when shutdown was already requested', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const shutdown = new globalThis.AbortController();
  shutdown.abort();

  await runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
      },
      stop: async () => {
        calls.push('operational.stop');
      },
    },
    shutdownSignal: shutdown.signal,
    createRuntime: async () => {
      calls.push('runtime.factory');
      throw new Error('runtime should not be created when shutdown is already requested');
    },
  });

  assert.deepEqual(calls, ['operational.start', 'operational.stop']);
  assert.equal(
    entries.some((entry) => entry.level === 'info' && entry.msg === 'outbox worker bootstrapped'),
    true
  );
});

await test('runOutboxWorkerHost exits promptly when shutdown lands during active runtime bootstrap', async () => {
  const calls: string[] = [];
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const shutdown = new globalThis.AbortController();
  let resolveRuntime: ((runtime: { start(): Promise<void>; stop(): Promise<void> }) => void) | null =
    null;

  const hostPromise = runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
      },
      stop: async () => {
        calls.push('operational.stop');
      },
    },
    shutdownSignal: shutdown.signal,
    createRuntime: async () => {
      calls.push('runtime.factory');
      return new Promise((resolve) => {
        resolveRuntime = resolve;
      });
    },
  });

  await waitFor(() => calls.includes('runtime.factory'));
  shutdown.abort();

  const result = await Promise.race([
    hostPromise.then(() => 'resolved'),
    sleep(100).then(() => 'timed-out'),
  ]);

  assert.equal(result, 'resolved');
  assert.deepEqual(calls, ['operational.start', 'runtime.factory', 'operational.stop']);

  resolveRuntime?.({
    start: async () => {
      calls.push('runtime.start');
    },
    stop: async () => {
      calls.push('runtime.stop');
    },
  });

  await waitFor(() => calls.includes('runtime.stop'));
  assert.deepEqual(calls, [
    'operational.start',
    'runtime.factory',
    'operational.stop',
    'runtime.stop',
  ]);
});

await test('runOutboxWorkerHost logs a warning if late runtime cleanup fails after shutdown during bootstrap', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const shutdown = new globalThis.AbortController();
  let resolveRuntime: ((runtime: { start(): Promise<void>; stop(): Promise<void> }) => void) | null =
    null;

  const hostPromise = runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
      },
      stop: async () => {
        calls.push('operational.stop');
      },
    },
    shutdownSignal: shutdown.signal,
    createRuntime: async () => {
      calls.push('runtime.factory');
      return new Promise((resolve) => {
        resolveRuntime = resolve;
      });
    },
  });

  await waitFor(() => calls.includes('runtime.factory'));
  shutdown.abort();
  await hostPromise;

  resolveRuntime?.({
    start: async () => {
      calls.push('runtime.start');
    },
    stop: async () => {
      calls.push('runtime.stop');
      throw new Error('synthetic late cleanup failure');
    },
  });

  await waitFor(() =>
    entries.some(
      (entry) =>
        entry.level === 'warn' &&
        entry.msg === 'outbox runtime cleanup failed after shutdown during bootstrap'
    )
  );

  assert.deepEqual(calls, [
    'operational.start',
    'runtime.factory',
    'operational.stop',
    'runtime.stop',
  ]);
  assert.equal(calls.includes('runtime.start'), false);
});

await test('runOutboxWorkerHost does not miss an abort that lands during passive listener registration', async () => {
  const calls: string[] = [];
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
  });

  const result = await Promise.race([
    runOutboxWorkerHost({
      env,
      logger,
      monitor,
      operationalServer: {
        start: async () => {
          calls.push('operational.start');
        },
        stop: async () => {
          calls.push('operational.stop');
        },
      },
      shutdownSignal:
        new AbortDuringListenerRegistrationSignal() as unknown as globalThis.AbortSignal,
      createRuntime: async () => {
        calls.push('runtime.factory');
        throw new Error('runtime should not be created in passive mode');
      },
    }).then(() => 'resolved'),
    sleep(100).then(() => 'timed-out'),
  ]);

  assert.equal(result, 'resolved');
  assert.deepEqual(calls, ['operational.start', 'operational.stop']);
  assert.equal(monitor.getHealthSnapshot().state, 'passive');
});

await test('runOutboxWorkerHost rethrows operational server start failures and does not bootstrap the runtime', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const startupError = new Error('synthetic admin start failure');

  await assert.rejects(
    () =>
      runOutboxWorkerHost({
        env,
        logger,
        monitor,
        operationalServer: {
          start: async () => {
            calls.push('operational.start');
            throw startupError;
          },
          stop: async () => {
            calls.push('operational.stop');
          },
        },
        shutdownSignal: new globalThis.AbortController().signal,
        createRuntime: async () => {
          calls.push('runtime.factory');
          throw new Error('runtime factory should not run after admin start failure');
        },
      }),
    startupError
  );

  assert.deepEqual(calls, ['operational.start', 'operational.stop']);
  assert.equal(
    entries.some((entry) => entry.msg === 'outbox worker bootstrapped'),
    false
  );
  assert.equal(monitor.getHealthSnapshot().state, 'starting');
});

await test('runOutboxWorkerHost rethrows runtime factory failures after stopping the admin server', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const runtimeFactoryError = new Error('synthetic runtime factory failure');

  await assert.rejects(
    () =>
      runOutboxWorkerHost({
        env,
        logger,
        monitor,
        operationalServer: {
          start: async () => {
            calls.push('operational.start');
          },
          stop: async () => {
            calls.push('operational.stop');
          },
        },
        shutdownSignal: new globalThis.AbortController().signal,
        createRuntime: async () => {
          calls.push('runtime.factory');
          throw runtimeFactoryError;
        },
      }),
    runtimeFactoryError
  );

  assert.deepEqual(calls, ['operational.start', 'runtime.factory', 'operational.stop']);
  assert.equal(
    entries.some((entry) => entry.msg === 'outbox worker bootstrapped'),
    true
  );
  assert.equal(monitor.getHealthSnapshot().state, 'starting');
});

async function waitFor(predicate: () => boolean, timeoutMs = 100): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}

await test('runOutboxWorkerHost rethrows runtime start failures after cleanup', async () => {
  const calls: string[] = [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });
  const runtimeStartError = new Error('synthetic runtime start failure');

  await assert.rejects(
    () =>
      runOutboxWorkerHost({
        env,
        logger,
        monitor,
        operationalServer: {
          start: async () => {
            calls.push('operational.start');
          },
          stop: async () => {
            calls.push('operational.stop');
          },
        },
        shutdownSignal: new globalThis.AbortController().signal,
        createRuntime: async () => {
          calls.push('runtime.factory');
          return {
            start: async () => {
              calls.push('runtime.start');
              throw runtimeStartError;
            },
            stop: async () => {
              calls.push('runtime.stop');
            },
          };
        },
      }),
    runtimeStartError
  );

  assert.deepEqual(calls, [
    'operational.start',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
  ]);
  assert.equal(
    entries.some((entry) => entry.msg === 'outbox worker bootstrapped'),
    true
  );
  assert.equal(monitor.getHealthSnapshot().state, 'starting');
});
