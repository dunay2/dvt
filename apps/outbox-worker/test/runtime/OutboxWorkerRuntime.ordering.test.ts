import type { DeadLetterRecord, EventEnvelope, OutboxRecord } from '@dvt/contracts';
import type { IOutboxStorage, OutboxTickResult } from '@dvt/delivery';
import { InMemoryOutboxStorage } from '@dvt/delivery/testing';
import { describe, expect } from 'vitest';

import { OutboxWorkerRuntime } from '../../src/runtime/OutboxWorkerRuntime.js';

import {
  createLoggerState,
  createSyntheticError,
  runtimeEventFixture,
  runtimeFailures,
  runtimeTest,
  waitForCondition,
} from './runtimeTestSupport.js';

function makeRuntimeEvent(runId: string, runSeq: number): EventEnvelope {
  return {
    eventId: `evt-${runId}-${runSeq}`,
    eventType: runtimeEventFixture.eventType,
    runId,
    tenantId: runtimeEventFixture.tenantId,
    projectId: runtimeEventFixture.projectId,
    environmentId: runtimeEventFixture.environmentId,
    planId: runtimeEventFixture.planId,
    planVersion: runtimeEventFixture.planVersion,
    logicalAttemptId: runtimeEventFixture.logicalAttemptId,
    engineAttemptId: runtimeEventFixture.engineAttemptId,
    emittedAt: runtimeEventFixture.emittedAt,
    idempotencyKey: `key-${runId}-${runSeq}`,
    payloadVersion: 1,
    runSeq,
    persistedAt: runtimeEventFixture.persistedAt,
  };
}

class FailFirstMarkDeliveredStorage implements IOutboxStorage {
  private failed = false;

  constructor(private readonly inner: InMemoryOutboxStorage) {}

  async enqueueTx(runId: string, events: EventEnvelope[]): Promise<void> {
    await this.inner.enqueueTx(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.inner.listPending(limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (!this.failed) {
      this.failed = true;
      throw new Error('synthetic ack failure');
    }
    await this.inner.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.inner.markFailed(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    return (await this.inner.hasPendingRetries?.(selection)) ?? false;
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    return this.inner.listDeadLetter(limit, tenantId);
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    return this.inner.replayDeadLetters(options);
  }
}

describe('OutboxWorkerRuntime ordering', () => {
  runtimeTest(
    { title: 'runtime does not bypass later same-run events after a failure' },
    async () => {
      const now = { value: 0 };
      const storage = new InMemoryOutboxStorage({ nowMs: () => now.value });
      const published: EventEnvelope[] = [];
      let publishCalls = 0;
      const bus = {
        async publish(events: EventEnvelope[]): Promise<void> {
          publishCalls += 1;
          if (publishCalls === 1) {
            throw createSyntheticError(runtimeFailures.fatalPublish);
          }
          published.push(...events);
        },
      };
      const { logger } = createLoggerState();
      const observedTicks: OutboxTickResult[] = [];
      const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
        pollIntervalMs: 25,
        errorBackoffMs: 25,
        batchSize: 10,
        nowMs: () => now.value,
        hooks: {
          onTick(result) {
            observedTicks.push(result);
          },
        },
      });

      await storage.enqueueTx('run-ordered', [
        makeRuntimeEvent('run-ordered', 1),
        makeRuntimeEvent('run-ordered', 2),
      ]);

      const loop = runtime.start();
      await waitForCondition(() => observedTicks.length >= 1);

      expect(published.length).toBe(0);
      expect(observedTicks[0]?.claimedCount).toBe(1);
      expect(observedTicks[0]?.retriedCount).toBe(1);

      now.value = 1_001;
      await waitForCondition(() => published.length === 2);

      await runtime.stop();
      await loop;

      expect(published.map((event) => event.runSeq)).toEqual([1, 2]);
      expect((await storage.listPending(10)).length).toBe(0);
    }
  );

  runtimeTest(
    { title: 'runtime redelivers markDelivered failures before later same-run events' },
    async () => {
      const now = { value: 0 };
      const storage = new FailFirstMarkDeliveredStorage(
        new InMemoryOutboxStorage({ nowMs: () => now.value })
      );
      const published: EventEnvelope[] = [];
      const { logger } = createLoggerState();
      const observedTicks: OutboxTickResult[] = [];
      const runtime = new OutboxWorkerRuntime(
        storage,
        {
          async publish(events: EventEnvelope[]): Promise<void> {
            published.push(...events);
          },
        },
        logger,
        {
          pollIntervalMs: 25,
          errorBackoffMs: 25,
          batchSize: 10,
          nowMs: () => now.value,
          hooks: {
            onTick(result) {
              observedTicks.push(result);
            },
          },
        }
      );

      await storage.enqueueTx('run-ack-ordered', [
        makeRuntimeEvent('run-ack-ordered', 1),
        makeRuntimeEvent('run-ack-ordered', 2),
        makeRuntimeEvent('run-ack-ordered', 3),
      ]);

      const loop = runtime.start();
      await waitForCondition(() => observedTicks.length >= 1);

      expect(published.map((event) => event.runSeq)).toEqual([1]);
      expect(observedTicks[0]?.claimedCount).toBe(1);
      expect(observedTicks[0]?.retriedCount).toBe(1);

      now.value = 1_001;
      await waitForCondition(() => published.length === 4);

      await runtime.stop();
      await loop;

      expect(published.map((event) => event.runSeq)).toEqual([1, 1, 2, 3]);
      expect(published.map((event) => event.idempotencyKey)).toEqual([
        'key-run-ack-ordered-1',
        'key-run-ack-ordered-1',
        'key-run-ack-ordered-2',
        'key-run-ack-ordered-3',
      ]);
    }
  );
});
