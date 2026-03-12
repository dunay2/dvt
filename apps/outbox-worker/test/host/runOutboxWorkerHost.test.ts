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

const TEST_NOW_MS = 1_741_392_000_000;
const ACTIVE_ENV_INPUT = {
  NODE_ENV: 'test',
  DVT_OUTBOX_OWNERSHIP_MODE: 'active',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
  DVT_OUTBOX_EVENT_BUS_MODE: 'log',
} satisfies NodeJS.ProcessEnv;

type LogEntry = ReturnType<typeof makeLogger>['entries'][number];
type HostOptions = Parameters<typeof runOutboxWorkerHost>[0];
type HostRunOverrides = Omit<
  HostOptions,
  'env' | 'logger' | 'monitor' | 'operationalServer' | 'shutdownSignal'
> & {
  shutdownSignal?: globalThis.AbortSignal;
};

interface HostFixture {
  calls: string[];
  logger: OutboxWorkerRuntimeLogger;
  entries: LogEntry[];
  monitor: OutboxWorkerMonitor;
  env: HostOptions['env'];
  operationalServer: HostOptions['operationalServer'];
  shutdown: globalThis.AbortController;
}

interface RuntimeFactoryCallbacks {
  onCreate?(args: {
    runtimeEnv: ActiveEnv;
    runtimeLogger: OutboxWorkerRuntimeLogger;
    runtimeOptions: CreateOutboxWorkerRuntimeOptions;
  }): void;
  start?(signal?: globalThis.AbortSignal): Promise<void> | void;
  stop?(): Promise<void> | void;
}

interface TestRuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

interface DeferredBootstrapScenario {
  fixture: HostFixture & { env: ActiveEnv };
  hostPromise: Promise<void>;
  resolveRuntime(runtime: TestRuntimeHandle): void;
}

function loadActiveTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): ActiveEnv {
  const env = loadEnv({ ...ACTIVE_ENV_INPUT, ...overrides });
  assert.equal(env.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
  return env;
}

function loadPassiveTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): HostOptions['env'] {
  return loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
    ...overrides,
  });
}

function createHostFixture(
  env: HostOptions['env'],
  options: {
    calls?: string[];
    nowMs?: () => number;
    readyStaleAfterMs?: number;
    startError?: Error;
    stopError?: Error;
  } = {}
): HostFixture {
  const calls = options.calls ?? [];
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: options.nowMs ?? (() => TEST_NOW_MS),
    ...(options.readyStaleAfterMs === undefined
      ? {}
      : { readyStaleAfterMs: options.readyStaleAfterMs }),
  });

  return {
    calls,
    logger,
    entries,
    monitor,
    env,
    operationalServer: {
      start: async () => {
        calls.push('operational.start');
        if (options.startError) {
          throw options.startError;
        }
      },
      stop: async () => {
        calls.push('operational.stop');
        if (options.stopError) {
          throw options.stopError;
        }
      },
    },
    shutdown: new globalThis.AbortController(),
  };
}

function createActiveHostFixture(
  options: {
    calls?: string[];
    nowMs?: () => number;
    readyStaleAfterMs?: number;
    startError?: Error;
    stopError?: Error;
    envOverrides?: Partial<NodeJS.ProcessEnv>;
  } = {}
): HostFixture & { env: ActiveEnv } {
  return createHostFixture(loadActiveTestEnv(options.envOverrides), options) as HostFixture & {
    env: ActiveEnv;
  };
}

function createPassiveHostFixture(
  options: {
    calls?: string[];
    nowMs?: () => number;
    readyStaleAfterMs?: number;
    startError?: Error;
    stopError?: Error;
    envOverrides?: Partial<NodeJS.ProcessEnv>;
  } = {}
): HostFixture {
  return createHostFixture(loadPassiveTestEnv(options.envOverrides), options);
}

async function runHostWithFixture(
  fixture: HostFixture,
  overrides: HostRunOverrides = {}
): Promise<void> {
  const { shutdownSignal, ...rest } = overrides;

  await runOutboxWorkerHost({
    env: fixture.env,
    logger: fixture.logger,
    monitor: fixture.monitor,
    operationalServer: fixture.operationalServer,
    shutdownSignal: shutdownSignal ?? fixture.shutdown.signal,
    ...rest,
  });
}

function createRuntimeFactory(
  calls: string[],
  options: RuntimeFactoryCallbacks = {}
): NonNullable<HostOptions['createRuntime']> {
  return async (
    runtimeEnv: ActiveEnv,
    runtimeLogger,
    runtimeOptions: CreateOutboxWorkerRuntimeOptions = {}
  ) => {
    calls.push('runtime.factory');
    options.onCreate?.({ runtimeEnv, runtimeLogger, runtimeOptions });

    return {
      start: async (signal?: globalThis.AbortSignal) => {
        calls.push('runtime.start');
        await options.start?.(signal);
      },
      stop: async () => {
        calls.push('runtime.stop');
        await options.stop?.();
      },
    };
  };
}

function createThrowingRuntimeFactory(
  calls: string[],
  error: Error
): NonNullable<HostOptions['createRuntime']> {
  return async () => {
    calls.push('runtime.factory');
    throw error;
  };
}

function createUnexpectedRuntimeFactory(
  calls: string[],
  message: string
): NonNullable<HostOptions['createRuntime']> {
  return createThrowingRuntimeFactory(calls, new Error(message));
}

function createOwnershipGate(
  calls: string[],
  options: {
    available?: boolean;
    release?(): Promise<void> | void;
    waitForLoss?(): Promise<void>;
  } = {}
): NonNullable<HostOptions['ownershipGate']> {
  return {
    acquire: async () => {
      calls.push('ownership.acquire');
      if (options.available === false) {
        return null;
      }

      return {
        release: async () => {
          calls.push('ownership.release');
          await options.release?.();
        },
        ...(options.waitForLoss === undefined ? {} : { waitForLoss: options.waitForLoss }),
      };
    },
  };
}

async function assertHostRejects(
  fixture: HostFixture,
  expectedError: Error,
  overrides: HostRunOverrides
): Promise<void> {
  await assert.rejects(() => runHostWithFixture(fixture, overrides), expectedError);
}

function hasLogEntry(
  entries: readonly LogEntry[],
  predicate: (entry: LogEntry) => boolean
): boolean {
  return entries.some(predicate);
}

function assertBootstrappedLog(entries: readonly LogEntry[], expected = true): void {
  assert.equal(
    hasLogEntry(entries, (entry) => entry.msg === 'outbox worker bootstrapped'),
    expected
  );
}

function assertPassiveOperationalLifecycle(fixture: HostFixture): void {
  assert.deepEqual(fixture.calls, ['operational.start', 'operational.stop']);
  assert.equal(fixture.monitor.getHealthSnapshot().state, 'passive');
}

async function assertResolvesPromptly(promise: Promise<unknown>, timeoutMs = 100): Promise<void> {
  const result = await Promise.race([
    promise.then(() => 'resolved'),
    sleep(timeoutMs).then(() => 'timed-out'),
  ]);

  assert.equal(result, 'resolved');
}

async function assertOwnedRuntimeLifecycle(
  options: {
    stopError?: Error;
    expectedError?: Error;
  } = {}
): Promise<HostFixture & { env: ActiveEnv }> {
  const fixture = createActiveHostFixture(
    options.stopError === undefined ? {} : { stopError: options.stopError }
  );
  const hostOverrides = {
    ownershipGate: createOwnershipGate(fixture.calls),
    createRuntime: createRuntimeFactory(fixture.calls),
  } satisfies HostRunOverrides;

  if (options.expectedError) {
    await assertHostRejects(fixture, options.expectedError, hostOverrides);
  } else {
    await runHostWithFixture(fixture, hostOverrides);
  }

  assert.deepEqual(fixture.calls, [
    'operational.start',
    'ownership.acquire',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
    'ownership.release',
  ]);

  return fixture;
}

async function assertHostFailureScenario(options: {
  expectedError: Error;
  fixture: HostFixture;
  overrides: HostRunOverrides;
  expectedCalls: string[];
  expectBootstrappedLog: boolean;
}): Promise<void> {
  await assertHostRejects(options.fixture, options.expectedError, options.overrides);
  assert.deepEqual(options.fixture.calls, options.expectedCalls);
  assertBootstrappedLog(options.fixture.entries, options.expectBootstrappedLog);
  assert.equal(options.fixture.monitor.getHealthSnapshot().state, 'starting');
}

async function startDeferredBootstrapScenario(): Promise<DeferredBootstrapScenario> {
  const fixture = createActiveHostFixture();
  let pendingRuntimeResolver: ((runtime: TestRuntimeHandle) => void) | null = null;

  const hostPromise = runHostWithFixture(fixture, {
    createRuntime: async () => {
      fixture.calls.push('runtime.factory');
      return new Promise((resolve) => {
        pendingRuntimeResolver = resolve;
      });
    },
  });

  await waitFor(() => pendingRuntimeResolver !== null);

  return {
    fixture,
    hostPromise,
    resolveRuntime(runtime) {
      if (pendingRuntimeResolver === null) {
        throw new Error('expected pending runtime resolver during bootstrap');
      }
      pendingRuntimeResolver(runtime);
    },
  };
}

async function assertRuntimeFailureAfterBootstrap(options: {
  expectedError: Error;
  buildCreateRuntime(calls: string[]): NonNullable<HostOptions['createRuntime']>;
  expectedCalls: string[];
}): Promise<void> {
  const fixture = createActiveHostFixture();

  await assertHostFailureScenario({
    expectedError: options.expectedError,
    fixture,
    overrides: {
      createRuntime: options.buildCreateRuntime(fixture.calls),
    },
    expectedCalls: options.expectedCalls,
    expectBootstrappedLog: true,
  });
}

await test('runOutboxWorkerHost keeps passive mode observable without creating the runtime', async () => {
  const fixture = createPassiveHostFixture();
  fixture.shutdown.abort();

  await runHostWithFixture(fixture, {
    createRuntime: createUnexpectedRuntimeFactory(
      fixture.calls,
      'runtime should not be created in passive mode'
    ),
  });

  const snapshot = fixture.monitor.getHealthSnapshot();
  assertPassiveOperationalLifecycle(fixture);
  assert.equal(snapshot.state, 'passive');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.ready, false);
  assertBootstrappedLog(fixture.entries);
});

await test('runOutboxWorkerHost creates and starts the runtime when ownership mode is active', async () => {
  const fixture = createActiveHostFixture();
  let receivedObserver: CreateOutboxWorkerRuntimeOptions['observer'];
  let receivedHooks: CreateOutboxWorkerRuntimeOptions['hooks'];
  let receivedShutdownSignal: CreateOutboxWorkerRuntimeOptions['shutdownSignal'];
  let receivedSignal: globalThis.AbortSignal | null = null;

  await runHostWithFixture(fixture, {
    createRuntime: createRuntimeFactory(fixture.calls, {
      onCreate: ({ runtimeEnv, runtimeLogger, runtimeOptions }) => {
        receivedObserver = runtimeOptions.observer;
        receivedHooks = runtimeOptions.hooks;
        receivedShutdownSignal = runtimeOptions.shutdownSignal;
        assert.equal(runtimeEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
        assert.equal(runtimeEnv.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
        assert.equal(runtimeLogger, fixture.logger);
      },
      start: async (signal?: globalThis.AbortSignal) => {
        receivedSignal = signal ?? null;
      },
    }),
  });

  assert.deepEqual(fixture.calls, [
    'operational.start',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
  ]);
  assert.notEqual(receivedSignal, null);
  assert.notEqual(receivedSignal, fixture.shutdown.signal);
  assert.equal(receivedObserver, fixture.monitor);
  assert.equal(receivedHooks, fixture.monitor);
  assert.equal(receivedShutdownSignal, receivedSignal);
  assertBootstrappedLog(fixture.entries);
});

await test('runOutboxWorkerHost stays passive when active ownership is unavailable', async () => {
  const fixture = createActiveHostFixture();

  const hostPromise = runHostWithFixture(fixture, {
    ownershipGate: createOwnershipGate(fixture.calls, { available: false }),
    createRuntime: createUnexpectedRuntimeFactory(
      fixture.calls,
      'runtime should not be created when ownership is unavailable'
    ),
  });

  await waitFor(() => fixture.calls.includes('ownership.acquire'));
  const passiveSnapshot = fixture.monitor.getHealthSnapshot();
  assert.equal(passiveSnapshot.state, 'passive');
  assert.equal(passiveSnapshot.ready, false);
  assert.equal(passiveSnapshot.owner, false);

  fixture.shutdown.abort();
  await hostPromise;

  assert.deepEqual(fixture.calls, ['operational.start', 'ownership.acquire', 'operational.stop']);
  assert.equal(
    hasLogEntry(
      fixture.entries,
      (entry) =>
        entry.level === 'warn' &&
        entry.msg === 'outbox ownership unavailable; entering passive mode'
    ),
    true
  );
});

await test('runOutboxWorkerHost releases acquired ownership after cleanup', async () => {
  await assertOwnedRuntimeLifecycle();
});

await test('runOutboxWorkerHost stops the active runtime when ownership is lost after startup', async () => {
  const fixture = createActiveHostFixture({
    nowMs: () => TEST_NOW_MS,
    readyStaleAfterMs: 60_000,
  });
  let ownershipLossProbeInstalled = false;
  let runtimeAbortObserved = false;
  let releaseRuntimeStart: () => void = () => {
    throw new Error('expected runtime abort after ownership loss');
  };
  let rejectOwnershipLoss: (error: Error) => void = () => {
    throw new Error('expected ownership-loss probe to be installed');
  };

  const hostPromise = runHostWithFixture(fixture, {
    ownershipGate: createOwnershipGate(fixture.calls, {
      waitForLoss: () =>
        new Promise<void>((_resolve, reject) => {
          ownershipLossProbeInstalled = true;
          rejectOwnershipLoss = (error) => {
            reject(error);
          };
        }),
    }),
    createRuntime: createRuntimeFactory(fixture.calls, {
      start: async (signal?: globalThis.AbortSignal) => {
        fixture.monitor.onStarted();
        fixture.monitor.onTick({
          claimedCount: 1,
          deliveredCount: 1,
          retriedCount: 0,
          deadLetteredCount: 0,
          oldestClaimedAgeMs: 1_000,
          retryBacklogActive: false,
        });

        await new Promise<void>((resolve) => {
          signal?.addEventListener(
            'abort',
            () => {
              runtimeAbortObserved = true;
              releaseRuntimeStart = resolve;
            },
            { once: true }
          );
        });
      },
    }),
  });

  await waitFor(() => fixture.calls.includes('runtime.start'));
  assert.equal(fixture.monitor.getHealthSnapshot().ready, true);

  assert.equal(ownershipLossProbeInstalled, true);
  rejectOwnershipLoss(new Error('synthetic ownership session loss'));

  await waitFor(() => runtimeAbortObserved);

  const ownershipLost = fixture.monitor.getHealthSnapshot();
  assert.equal(ownershipLost.ok, true);
  assert.equal(ownershipLost.ready, false);
  assert.equal(ownershipLost.state, 'failing');
  assert.equal(ownershipLost.owner, false);
  assert.equal(ownershipLost.lastErrorMessage, 'synthetic ownership session loss');

  releaseRuntimeStart();

  await assert.rejects(hostPromise, /synthetic ownership session loss/);
  assert.deepEqual(fixture.calls, [
    'operational.start',
    'ownership.acquire',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
    'ownership.release',
  ]);
  assert.equal(
    hasLogEntry(
      fixture.entries,
      (entry) => entry.level === 'error' && entry.msg === 'outbox ownership lost; stopping host'
    ),
    true
  );
});

await test('runOutboxWorkerHost releases ownership before surfacing cleanup failures', async () => {
  const cleanupError = new Error('synthetic admin stop failure');
  await assertOwnedRuntimeLifecycle({
    stopError: cleanupError,
    expectedError: cleanupError,
  });
});

await test('runOutboxWorkerHost skips active ownership acquisition and runtime bootstrap when shutdown was already requested', async () => {
  const fixture = createActiveHostFixture();
  fixture.shutdown.abort();

  await runHostWithFixture(fixture, {
    ownershipGate: {
      acquire: async () => {
        fixture.calls.push('ownership.acquire');
        throw new Error('ownership should not be acquired when shutdown is already requested');
      },
    },
    createRuntime: createUnexpectedRuntimeFactory(
      fixture.calls,
      'runtime should not be created when shutdown is already requested'
    ),
  });

  assert.deepEqual(fixture.calls, ['operational.start', 'operational.stop']);
  assertBootstrappedLog(fixture.entries);
});

await test('runOutboxWorkerHost exits promptly when shutdown lands during active runtime bootstrap', async () => {
  const scenario = await startDeferredBootstrapScenario();
  scenario.fixture.shutdown.abort();

  await assertResolvesPromptly(scenario.hostPromise);
  assert.deepEqual(scenario.fixture.calls, [
    'operational.start',
    'runtime.factory',
    'operational.stop',
  ]);

  scenario.resolveRuntime({
    start: async () => {
      scenario.fixture.calls.push('runtime.start');
    },
    stop: async () => {
      scenario.fixture.calls.push('runtime.stop');
    },
  });

  await waitFor(() => scenario.fixture.calls.includes('runtime.stop'));
  assert.deepEqual(scenario.fixture.calls, [
    'operational.start',
    'runtime.factory',
    'operational.stop',
    'runtime.stop',
  ]);
});

await test('runOutboxWorkerHost logs a warning if late runtime cleanup fails after shutdown during bootstrap', async () => {
  const scenario = await startDeferredBootstrapScenario();
  scenario.fixture.shutdown.abort();
  await scenario.hostPromise;

  scenario.resolveRuntime({
    start: async () => {
      scenario.fixture.calls.push('runtime.start');
    },
    stop: async () => {
      scenario.fixture.calls.push('runtime.stop');
      throw new Error('synthetic late cleanup failure');
    },
  });

  await waitFor(() =>
    hasLogEntry(
      scenario.fixture.entries,
      (entry) =>
        entry.level === 'warn' &&
        entry.msg === 'outbox runtime cleanup failed after shutdown during bootstrap'
    )
  );

  assert.deepEqual(scenario.fixture.calls, [
    'operational.start',
    'runtime.factory',
    'operational.stop',
    'runtime.stop',
  ]);
  assert.equal(scenario.fixture.calls.includes('runtime.start'), false);
});

await test('runOutboxWorkerHost withdraws readiness immediately when shutdown lands during active runtime drain', async () => {
  const clock = { nowMs: TEST_NOW_MS };
  const fixture = createActiveHostFixture({
    nowMs: () => clock.nowMs,
    readyStaleAfterMs: 60_000,
  });
  let releaseRuntimeStart: (() => void) | null = null;

  const hostPromise = runHostWithFixture(fixture, {
    createRuntime: createRuntimeFactory(fixture.calls, {
      start: async (signal?: globalThis.AbortSignal) => {
        fixture.monitor.onStarted();
        fixture.monitor.onTick({
          claimedCount: 1,
          deliveredCount: 1,
          retriedCount: 0,
          deadLetteredCount: 0,
          oldestClaimedAgeMs: 1_000,
          retryBacklogActive: false,
        });

        await new Promise<void>((resolve) => {
          signal?.addEventListener(
            'abort',
            () => {
              releaseRuntimeStart = resolve;
            },
            { once: true }
          );
        });
      },
    }),
  });

  await waitFor(() => fixture.calls.includes('runtime.start'));
  assert.equal(fixture.monitor.getHealthSnapshot().ready, true);

  fixture.shutdown.abort();
  await waitFor(() => releaseRuntimeStart !== null);

  const stopping = fixture.monitor.getHealthSnapshot();
  assert.equal(stopping.ok, true);
  assert.equal(stopping.ready, false);
  assert.equal(stopping.state, 'stopping');

  assert.notEqual(
    releaseRuntimeStart,
    null,
    'expected runtime start release after shutdown during active runtime drain'
  );
  const releasePendingRuntimeStart = releaseRuntimeStart!;
  releasePendingRuntimeStart();
  await hostPromise;

  assert.deepEqual(fixture.calls, [
    'operational.start',
    'runtime.factory',
    'runtime.start',
    'runtime.stop',
    'operational.stop',
  ]);
});

await test('runOutboxWorkerHost does not miss an abort that lands during passive listener registration', async () => {
  const fixture = createPassiveHostFixture();

  await assertResolvesPromptly(
    runHostWithFixture(fixture, {
      shutdownSignal:
        new AbortDuringListenerRegistrationSignal() as unknown as globalThis.AbortSignal,
      createRuntime: createUnexpectedRuntimeFactory(
        fixture.calls,
        'runtime should not be created in passive mode'
      ),
    })
  );

  assertPassiveOperationalLifecycle(fixture);
});

await test('runOutboxWorkerHost rethrows operational server start failures and does not bootstrap the runtime', async () => {
  const startupError = new Error('synthetic admin start failure');
  const fixture = createActiveHostFixture({ startError: startupError });

  await assertHostFailureScenario({
    expectedError: startupError,
    fixture,
    overrides: {
      createRuntime: async () => {
        fixture.calls.push('runtime.factory');
        throw new Error('runtime factory should not run after admin start failure');
      },
    },
    expectedCalls: ['operational.start', 'operational.stop'],
    expectBootstrappedLog: false,
  });
});

await test('runOutboxWorkerHost rethrows runtime factory failures after stopping the admin server', async () => {
  const runtimeFactoryError = new Error('synthetic runtime factory failure');
  await assertRuntimeFailureAfterBootstrap({
    expectedError: runtimeFactoryError,
    buildCreateRuntime: (calls) => createThrowingRuntimeFactory(calls, runtimeFactoryError),
    expectedCalls: ['operational.start', 'runtime.factory', 'operational.stop'],
  });
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
  const runtimeStartError = new Error('synthetic runtime start failure');
  await assertRuntimeFailureAfterBootstrap({
    expectedError: runtimeStartError,
    buildCreateRuntime: (calls) =>
      createRuntimeFactory(calls, {
        start: async () => {
          throw runtimeStartError;
        },
      }),
    expectedCalls: [
      'operational.start',
      'runtime.factory',
      'runtime.start',
      'runtime.stop',
      'operational.stop',
    ],
  });
});
