import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import test from 'node:test';

import { InMemoryEventBus, type IOutboxStorage, type OutboxRecord, type RunEventPersisted } from '@dvt/engine';

import { OutboxWorkerRuntime } from '../../src/runtime/OutboxWorkerRuntime.js';

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
}

function makeLogger(): {
  logger: { info(data: Record<string, unknown>, msg?: string): void; error(data: Record<string, unknown>, msg?: string): void };
  getErrorCount(): number;
} {
  let errorCount = 0;
  return {
    logger: {
      info: () => {},
      error: () => {
        errorCount += 1;
      },
    },
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
