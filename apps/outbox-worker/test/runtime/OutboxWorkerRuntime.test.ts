import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import test from 'node:test';

import {
  InMemoryEventBus,
  type IOutboxStorage,
  type OutboxRecord,
  type OutboxTickResult,
  type RunEventPersisted,
} from '@dvt/engine';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
  type OutboxWorkerRuntimeLogger,
} from '../../src/runtime/OutboxWorkerRuntime.js';

class MemoryOutboxStorage implements IOutboxStorage {
  private readonly records: OutboxRecord[] = [];

  async enqueueTx(_runId: string, events: RunEventPersisted[]): Promise<void> {
    for (const event of events) {
      this.records.push({
        id: event.eventId,
        createdAt: event.persistedAt,
        idempotencyKey: event.idempotencyKey,
        payload: event,
        attempts: 0,
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.records.slice(0, limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    for (const id of ids) {
      const index = this.records.findIndex((record) => record.id === id);
      if (index >= 0) {
        this.records.splice(index, 1);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record) return;
    record.attempts += 1;
    record.lastError = error;
  }

  async hasPendingRetries(): Promise<boolean> {
    return this.records.some((record) => record.attempts > 0);
  }
}

function makeLogger(): {
  logger: OutboxWorkerRuntimeLogger;
  getErrorCount(): number;
  getWarnCount(): number;
} {
  let errorCount = 0;
  let warnCount = 0;
  return {
    logger: {
      info: (): void => {},
      warn: (): void => {
        warnCount += 1;
      },
      error: (): void => {
        errorCount += 1;
      },
    } satisfies OutboxWorkerRuntimeLogger,
    getErrorCount() {
      return errorCount;
    },
    getWarnCount() {
      return warnCount;
    },
  };
}

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

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}

class CountingHooks implements OutboxWorkerRuntimeHooks {
  public started = false;
  public tickCount = 0;
  public stopped = false;

  onStarted(): void {
    this.started = true;
  }

  onTick(): void {
    this.tickCount += 1;
  }

  onStopped(): void {
    this.stopped = true;
  }
}

await test('start drains pending records and stop exits cleanly', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 25,
    errorBackoffMs: 25,
    batchSize: 10,
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  const loop = runtime.start();
  await waitFor(() => bus.published.length === 1);
  await runtime.stop();
  await loop;

  assert.equal((await storage.listPending(10)).length, 0);
});

await test('stop interrupts idle polling wait without hanging', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
  });

  const loop = runtime.start();
  await sleep(25);

  const startedAt = Date.now();
  await runtime.stop();
  await loop;
  const elapsedMs = Date.now() - startedAt;

  assert.ok(elapsedMs < 1000);
});

await test('stop interrupts an in-flight tick when an interrupter is configured', async () => {
  let tickStarted = false;
  let interruptBlockedTick: (() => void) | null = null;
  const storage: IOutboxStorage = {
    async enqueueTx(): Promise<void> {},
    async listPending(): Promise<OutboxRecord[]> {
      tickStarted = true;
      return new Promise<OutboxRecord[]>((_resolve, reject) => {
        interruptBlockedTick = () => reject(new Error('synthetic tick interruption'));
      });
    },
    async markDelivered(): Promise<void> {},
    async markFailed(): Promise<void> {},
  };
  const bus = new InMemoryEventBus();
  let interruptCalls = 0;
  const { logger, getErrorCount } = makeLogger();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
    interruptPendingTick: async () => {
      interruptCalls += 1;
      interruptBlockedTick?.();
    },
  });

  const loop = runtime.start();
  await waitFor(() => tickStarted && interruptBlockedTick !== null);

  const startedAt = Date.now();
  await runtime.stop();
  await loop;
  const elapsedMs = Date.now() - startedAt;

  assert.equal(interruptCalls, 1);
  assert.equal(getErrorCount(), 0);
  assert.ok(elapsedMs < 1000);
});

await test('runtime passes a clock into OutboxWorker so tick lag is populated', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  let firstTick: OutboxTickResult | null = null;
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
    nowMs: () => Date.parse('2026-03-08T00:01:00.000Z'),
    hooks: {
      onTick(result) {
        firstTick ??= result;
      },
    },
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  const loop = runtime.start();
  await waitFor(() => firstTick !== null);
  await runtime.stop();
  await loop;

  assert.equal(firstTick?.oldestClaimedAgeMs, 60_000);
  assert.equal(firstTick?.retryBacklogActive, false);
});

await test('runtime preserves receiver for object-backed hooks', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  const hooks = new CountingHooks();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
    hooks,
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  const loop = runtime.start();
  await waitFor(() => hooks.tickCount > 0);
  await runtime.stop();
  await loop;

  assert.equal(hooks.started, true);
  assert.equal(hooks.tickCount, 1);
  assert.equal(hooks.stopped, true);
});

await test('runtime stops and surfaces the first failure when stopOnError=true', async () => {
  const storage = new MemoryOutboxStorage();
  let publishCalls = 0;
  const bus = {
    async publish(): Promise<void> {
      publishCalls += 1;
      throw new Error('synthetic fatal publish failure');
    },
  };
  const { logger, getErrorCount } = makeLogger();
  const hooks = new CountingHooks();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 25,
    errorBackoffMs: 25,
    batchSize: 10,
    stopOnError: true,
    hooks,
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  await assert.rejects(() => runtime.start(), /synthetic fatal publish failure/);
  await runtime.stop();

  assert.equal(publishCalls, 1);
  assert.equal(getErrorCount(), 1);
  assert.equal(hooks.started, true);
  assert.equal(hooks.stopped, true);
  assert.equal((await storage.listPending(10))[0]?.attempts, 1);
});

await test('runtime preserves partial tick telemetry before surfacing a stop-on-error failure', async () => {
  const storage = new MemoryOutboxStorage();
  let publishCalls = 0;
  let firstTick: OutboxTickResult | null = null;
  let observedError: unknown = null;
  const bus = {
    async publish(): Promise<void> {
      publishCalls += 1;
      if (publishCalls === 2) {
        throw new Error('synthetic fatal publish failure');
      }
    },
  };
  const { logger, getErrorCount } = makeLogger();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 25,
    errorBackoffMs: 25,
    batchSize: 10,
    stopOnError: true,
    hooks: {
      onTick(result) {
        firstTick = result;
      },
      onError(error) {
        observedError = error;
      },
    },
  });

  await storage.enqueueTx('run-1', [makeEvent('1'), makeEvent('2')]);

  await assert.rejects(() => runtime.start(), /synthetic fatal publish failure/);
  await runtime.stop();

  assert.equal(publishCalls, 2);
  assert.ok(firstTick);
  assert.equal(firstTick.claimedCount, 2);
  assert.equal(firstTick.deliveredCount, 1);
  assert.equal(firstTick.retriedCount, 1);
  assert.equal(firstTick.deadLetteredCount, 0);
  assert.equal(firstTick.retryBacklogActive, true);
  assert.equal(getErrorCount(), 1);
  assert.ok(observedError instanceof Error);
  assert.equal(observedError.message, 'synthetic fatal publish failure');
});

await test('runtime treats hook failures as best-effort and keeps draining', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger, getWarnCount } = makeLogger();
  const hooks: OutboxWorkerRuntimeHooks = {
    onStarted() {
      throw new Error('onStarted failed');
    },
    onTick() {
      throw new Error('onTick failed');
    },
    onStopped() {
      throw new Error('onStopped failed');
    },
  };
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
    hooks,
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  const loop = runtime.start();
  await waitFor(() => bus.published.length === 1);
  await runtime.stop();
  await loop;

  assert.equal((await storage.listPending(10)).length, 0);
  assert.equal(getWarnCount(), 3);
});

await test('runtime start is idempotent and reuses the same loop promise', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
  });

  await storage.enqueueTx('run-1', [makeEvent('1')]);

  const firstStart = runtime.start();
  const secondStart = runtime.start();

  assert.equal(firstStart, secondStart);

  await waitFor(() => bus.published.length === 1);
  await runtime.stop();
  await firstStart;

  assert.equal((await storage.listPending(10)).length, 0);
});

await test('runtime does not start the loop when the provided signal is already aborted', async () => {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const { logger } = makeLogger();
  const hooks = new CountingHooks();
  const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
    pollIntervalMs: 60_000,
    errorBackoffMs: 25,
    hooks,
  });
  const controller = new globalThis.AbortController();

  await storage.enqueueTx('run-1', [makeEvent('1')]);
  controller.abort();

  await runtime.start(controller.signal);

  assert.equal(hooks.started, false);
  assert.equal(hooks.tickCount, 0);
  assert.equal(hooks.stopped, false);
  assert.equal(bus.published.length, 0);
  assert.equal((await storage.listPending(10)).length, 1);
});
