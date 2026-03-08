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
} {
  let errorCount = 0;
  return {
    logger: {
      info: (): void => {},
      error: (): void => {
        errorCount += 1;
      },
    } satisfies OutboxWorkerRuntimeLogger,
    getErrorCount() {
      return errorCount;
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
