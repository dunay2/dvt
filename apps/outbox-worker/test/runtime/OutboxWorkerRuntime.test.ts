import { setTimeout as sleep } from 'node:timers/promises';

import type {
  EventEnvelope as RunEventPersisted,
  IOutboxStorage,
  OutboxRecord,
  OutboxTickResult,
} from '@dvt/contracts';
import { InMemoryEventBus, InMemoryOutboxStorage } from '@dvt/delivery/testing';
import { describe, expect } from 'vitest';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
} from '../../src/runtime/OutboxWorkerRuntime.js';

import {
  AbortDuringListenerRegistrationSignal,
  CountingHooks,
  MemoryOutboxStorage,
  assertPresent,
  createLoggerState,
  createMemoryRuntime,
  createSyntheticError,
  enqueuePendingEvents,
  runtimeClock,
  runtimeEventFixture,
  runtimeFailures,
  runtimeScenarios,
  runtimeTest,
  waitForCondition,
} from './runtimeTestSupport.js';

function makeRuntimeEvent(runId: string, runSeq: number): RunEventPersisted {
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

  async enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void> {
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

  async listDeadLetter(limit: number, tenantId: string): Promise<OutboxRecord[]> {
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

describe('OutboxWorkerRuntime', () => {
  runtimeTest(runtimeScenarios.startDrainsPendingRecordsAndStopExitsCleanly, async () => {
    const { storage, bus, runtime } = createMemoryRuntime({
      pollIntervalMs: 25,
      errorBackoffMs: 25,
      batchSize: 10,
    });

    await enqueuePendingEvents(storage, 1);

    const loop = runtime.start();
    await waitForCondition(() => bus.published.length === 1);
    await runtime.stop();
    await loop;

    expect((await storage.listPending(10)).length).toBe(0);
  });

  runtimeTest(runtimeScenarios.stopInterruptsIdlePollingWaitWithoutHanging, async () => {
    const { runtime } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
    });

    const loop = runtime.start();
    await sleep(25);

    const startedAt = Date.now();
    await runtime.stop();
    await loop;
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1000);
  });

  runtimeTest(
    runtimeScenarios.stopInterruptsAnInFlightTickWhenAnInterrupterIsConfigured,
    async () => {
      let tickStarted = false;
      let interruptBlockedTick: (() => void) | null = null;
      const storage: IOutboxStorage = {
        async enqueueTx(): Promise<void> {},
        async listPending(): Promise<OutboxRecord[]> {
          tickStarted = true;
          return new Promise<OutboxRecord[]>((_resolve, reject) => {
            interruptBlockedTick = () =>
              reject(createSyntheticError(runtimeFailures.tickInterrupted));
          });
        },
        async markDelivered(): Promise<void> {},
        async markFailed(): Promise<void> {},
        async listDeadLetter(): Promise<[]> {
          return [];
        },
        async replayDeadLetters(): Promise<number> {
          return 0;
        },
      };
      const bus = new InMemoryEventBus();
      let interruptCalls = 0;
      const { logger, getErrorCount } = createLoggerState();
      const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
        pollIntervalMs: 60_000,
        errorBackoffMs: 25,
        interruptPendingTick: async () => {
          interruptCalls += 1;
          interruptBlockedTick?.();
        },
      });

      const loop = runtime.start();
      await waitForCondition(() => tickStarted && interruptBlockedTick !== null);

      const startedAt = Date.now();
      await runtime.stop();
      await loop;
      const elapsedMs = Date.now() - startedAt;

      expect(interruptCalls).toBe(1);
      expect(getErrorCount()).toBe(0);
      expect(elapsedMs).toBeLessThan(1000);
    }
  );

  runtimeTest(
    runtimeScenarios.runtimePassesAClockIntoOutboxWorkerSoTickLagIsPopulated,
    async () => {
      const observed = { firstTick: null as OutboxTickResult | null };
      const { storage, runtime } = createMemoryRuntime({
        pollIntervalMs: 60_000,
        errorBackoffMs: 25,
        nowMs: () => runtimeClock.oneMinuteAfterFixtureEventMs,
        hooks: {
          onTick(result) {
            observed.firstTick ??= result;
          },
        },
      });

      await enqueuePendingEvents(storage, 1);

      const loop = runtime.start();
      await waitForCondition(() => observed.firstTick !== null);
      await runtime.stop();
      await loop;

      const firstTick = observed.firstTick;
      assertPresent(firstTick);
      expect(firstTick.oldestClaimedAgeMs).toBe(60_000);
      expect(firstTick.retryBacklogActive).toBe(false);
    }
  );

  runtimeTest(runtimeScenarios.runtimePreservesReceiverForObjectBackedHooks, async () => {
    const hooks = new CountingHooks();
    const { storage, runtime } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
      hooks,
    });

    await enqueuePendingEvents(storage, 1);

    const loop = runtime.start();
    await waitForCondition(() => hooks.tickCount > 0);
    await runtime.stop();
    await loop;

    expect(hooks.started).toBe(true);
    expect(hooks.tickCount).toBe(1);
    expect(hooks.stopped).toBe(true);
  });

  runtimeTest(
    runtimeScenarios.runtimeStopsAndSurfacesTheFirstFailureWhenStopOnErrorIsTrue,
    async () => {
      const storage = new MemoryOutboxStorage();
      let publishCalls = 0;
      const bus = {
        async publish(): Promise<void> {
          publishCalls += 1;
          throw createSyntheticError(runtimeFailures.fatalPublish);
        },
      };
      const { logger, getErrorCount } = createLoggerState();
      const hooks = new CountingHooks();
      const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
        pollIntervalMs: 25,
        errorBackoffMs: 25,
        batchSize: 10,
        stopOnError: true,
        hooks,
      });

      await enqueuePendingEvents(storage, 1);

      await expect(() => runtime.start()).rejects.toThrow(runtimeFailures.fatalPublish.pattern);
      await runtime.stop();

      expect(publishCalls).toBe(1);
      expect(getErrorCount()).toBe(1);
      expect(hooks.started).toBe(true);
      expect(hooks.stopped).toBe(true);
      expect((await storage.listPending(10))[0]?.attempts).toBe(1);
    }
  );

  runtimeTest(
    runtimeScenarios.runtimePreservesPartialTickTelemetryBeforeSurfacingAStopOnErrorFailure,
    async () => {
      const storage = new MemoryOutboxStorage();
      let publishCalls = 0;
      const observed = {
        firstTick: null as OutboxTickResult | null,
        error: null as unknown,
      };
      const bus = {
        async publish(): Promise<void> {
          publishCalls += 1;
          if (publishCalls === 2) {
            throw createSyntheticError(runtimeFailures.fatalPublish);
          }
        },
      };
      const { logger, getErrorCount } = createLoggerState();
      const runtime = new OutboxWorkerRuntime(storage, bus, logger, {
        pollIntervalMs: 25,
        errorBackoffMs: 25,
        batchSize: 10,
        stopOnError: true,
        hooks: {
          onTick(result) {
            observed.firstTick = result;
          },
          onError(error) {
            observed.error = error;
          },
        },
      });

      await enqueuePendingEvents(storage, 1, 2);

      await expect(() => runtime.start()).rejects.toThrow(runtimeFailures.fatalPublish.pattern);
      await runtime.stop();

      expect(publishCalls).toBe(2);
      const firstTick = observed.firstTick;
      assertPresent(firstTick);
      expect(firstTick.claimedCount).toBe(2);
      expect(firstTick.deliveredCount).toBe(1);
      expect(firstTick.retriedCount).toBe(1);
      expect(firstTick.deadLetteredCount).toBe(0);
      expect(firstTick.retryBacklogActive).toBe(true);
      expect(getErrorCount()).toBe(1);
      const observedError = observed.error;
      expect(observedError instanceof Error).toBe(true);
      expect((observedError as Error).message).toBe(runtimeFailures.fatalPublish.message);
    }
  );

  runtimeTest(
    { title: 'runtime does not bypass later same-run events after a failure' },
    async () => {
      const now = { value: 0 };
      const storage = new InMemoryOutboxStorage({ nowMs: () => now.value });
      const published: RunEventPersisted[] = [];
      let publishCalls = 0;
      const bus = {
        async publish(events: RunEventPersisted[]): Promise<void> {
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
      const published: RunEventPersisted[] = [];
      const { logger } = createLoggerState();
      const observedTicks: OutboxTickResult[] = [];
      const runtime = new OutboxWorkerRuntime(
        storage,
        {
          async publish(events: RunEventPersisted[]): Promise<void> {
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

  runtimeTest(runtimeScenarios.runtimeTreatsHookFailuresAsBestEffortAndKeepsDraining, async () => {
    const hooks: OutboxWorkerRuntimeHooks = {
      onStarted() {
        throw createSyntheticError(runtimeFailures.hookStarted);
      },
      onTick() {
        throw createSyntheticError(runtimeFailures.hookTick);
      },
      onStopped() {
        throw createSyntheticError(runtimeFailures.hookStopped);
      },
    };
    const { storage, bus, runtime, getWarnCount } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
      hooks,
    });

    await enqueuePendingEvents(storage, 1);

    const loop = runtime.start();
    await waitForCondition(() => bus.published.length === 1);
    await runtime.stop();
    await loop;

    expect((await storage.listPending(10)).length).toBe(0);
    expect(getWarnCount()).toBe(3);
  });

  runtimeTest(runtimeScenarios.runtimeStartIsIdempotentAndReusesTheSameLoopPromise, async () => {
    const { storage, bus, runtime } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
    });

    await enqueuePendingEvents(storage, 1);

    const firstStart = runtime.start();
    const secondStart = runtime.start();

    expect(firstStart).toBe(secondStart);

    await waitForCondition(() => bus.published.length === 1);
    await runtime.stop();
    await firstStart;

    expect((await storage.listPending(10)).length).toBe(0);
  });

  runtimeTest(
    runtimeScenarios.runtimeDoesNotStartTheLoopWhenTheProvidedSignalIsAlreadyAborted,
    async () => {
      const hooks = new CountingHooks();
      const { storage, bus, runtime } = createMemoryRuntime({
        pollIntervalMs: 60_000,
        errorBackoffMs: 25,
        hooks,
      });
      const controller = new globalThis.AbortController();

      await enqueuePendingEvents(storage, 1);
      controller.abort();

      await runtime.start(controller.signal);

      expect(hooks.started).toBe(false);
      expect(hooks.tickCount).toBe(0);
      expect(hooks.stopped).toBe(false);
      expect(bus.published.length).toBe(0);
      expect((await storage.listPending(10)).length).toBe(1);
    }
  );

  runtimeTest(
    runtimeScenarios.runtimeDoesNotMissAnAbortThatLandsDuringListenerRegistration,
    async () => {
      const hooks = new CountingHooks();
      const { storage, bus, runtime } = createMemoryRuntime({
        pollIntervalMs: 60_000,
        errorBackoffMs: 25,
        hooks,
      });
      const signal = new AbortDuringListenerRegistrationSignal();

      await enqueuePendingEvents(storage, 1);

      await runtime.start(signal as unknown as globalThis.AbortSignal);

      expect(hooks.started).toBe(false);
      expect(hooks.tickCount).toBe(0);
      expect(hooks.stopped).toBe(false);
      expect(bus.published.length).toBe(0);
      expect((await storage.listPending(10)).length).toBe(1);
    }
  );
});
