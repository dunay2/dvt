import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

import type {
  EventEnvelope as RunEventPersisted,
  IOutboxStorage,
  OutboxRecord,
  OutboxTickResult,
} from '@dvt/contracts';
import { InMemoryEventBus, InMemoryOutboxStorage } from '@dvt/delivery/testing';

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
}

await runtimeTest(runtimeScenarios.startDrainsPendingRecordsAndStopExitsCleanly, async () => {
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

  assert.equal((await storage.listPending(10)).length, 0);
});

await runtimeTest(runtimeScenarios.stopInterruptsIdlePollingWaitWithoutHanging, async () => {
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

  assert.ok(elapsedMs < 1000);
});

await runtimeTest(
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

    assert.equal(interruptCalls, 1);
    assert.equal(getErrorCount(), 0);
    assert.ok(elapsedMs < 1000);
  }
);

await runtimeTest(
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
    assert.equal(firstTick.oldestClaimedAgeMs, 60_000);
    assert.equal(firstTick.retryBacklogActive, false);
  }
);

await runtimeTest(runtimeScenarios.runtimePreservesReceiverForObjectBackedHooks, async () => {
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

  assert.equal(hooks.started, true);
  assert.equal(hooks.tickCount, 1);
  assert.equal(hooks.stopped, true);
});

await runtimeTest(
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

    await assert.rejects(() => runtime.start(), runtimeFailures.fatalPublish.pattern);
    await runtime.stop();

    assert.equal(publishCalls, 1);
    assert.equal(getErrorCount(), 1);
    assert.equal(hooks.started, true);
    assert.equal(hooks.stopped, true);
    assert.equal((await storage.listPending(10))[0]?.attempts, 1);
  }
);

await runtimeTest(
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

    await assert.rejects(() => runtime.start(), runtimeFailures.fatalPublish.pattern);
    await runtime.stop();

    assert.equal(publishCalls, 2);
    const firstTick = observed.firstTick;
    assertPresent(firstTick);
    assert.equal(firstTick.claimedCount, 2);
    assert.equal(firstTick.deliveredCount, 1);
    assert.equal(firstTick.retriedCount, 1);
    assert.equal(firstTick.deadLetteredCount, 0);
    assert.equal(firstTick.retryBacklogActive, true);
    assert.equal(getErrorCount(), 1);
    const observedError = observed.error;
    assert.ok(observedError instanceof Error);
    assert.equal(observedError.message, runtimeFailures.fatalPublish.message);
  }
);

await runtimeTest(
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

    assert.equal(published.length, 0);
    assert.equal(observedTicks[0]?.claimedCount, 1);
    assert.equal(observedTicks[0]?.retriedCount, 1);

    now.value = 1_001;
    await waitForCondition(() => published.length === 2);

    await runtime.stop();
    await loop;

    assert.deepEqual(
      published.map((event) => event.runSeq),
      [1, 2]
    );
    assert.equal((await storage.listPending(10)).length, 0);
  }
);

await runtimeTest(
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

    assert.deepEqual(
      published.map((event) => event.runSeq),
      [1]
    );
    assert.equal(observedTicks[0]?.claimedCount, 1);
    assert.equal(observedTicks[0]?.retriedCount, 1);

    now.value = 1_001;
    await waitForCondition(() => published.length === 4);

    await runtime.stop();
    await loop;

    assert.deepEqual(
      published.map((event) => event.runSeq),
      [1, 1, 2, 3]
    );
    assert.deepEqual(
      published.map((event) => event.idempotencyKey),
      [
        'key-run-ack-ordered-1',
        'key-run-ack-ordered-1',
        'key-run-ack-ordered-2',
        'key-run-ack-ordered-3',
      ]
    );
  }
);

await runtimeTest(
  runtimeScenarios.runtimeTreatsHookFailuresAsBestEffortAndKeepsDraining,
  async () => {
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

    assert.equal((await storage.listPending(10)).length, 0);
    assert.equal(getWarnCount(), 3);
  }
);

await runtimeTest(
  runtimeScenarios.runtimeStartIsIdempotentAndReusesTheSameLoopPromise,
  async () => {
    const { storage, bus, runtime } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
    });

    await enqueuePendingEvents(storage, 1);

    const firstStart = runtime.start();
    const secondStart = runtime.start();

    assert.equal(firstStart, secondStart);

    await waitForCondition(() => bus.published.length === 1);
    await runtime.stop();
    await firstStart;

    assert.equal((await storage.listPending(10)).length, 0);
  }
);

await runtimeTest(
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

    assert.equal(hooks.started, false);
    assert.equal(hooks.tickCount, 0);
    assert.equal(hooks.stopped, false);
    assert.equal(bus.published.length, 0);
    assert.equal((await storage.listPending(10)).length, 1);
  }
);

await runtimeTest(
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

    assert.equal(hooks.started, false);
    assert.equal(hooks.tickCount, 0);
    assert.equal(hooks.stopped, false);
    assert.equal(bus.published.length, 0);
    assert.equal((await storage.listPending(10)).length, 1);
  }
);
