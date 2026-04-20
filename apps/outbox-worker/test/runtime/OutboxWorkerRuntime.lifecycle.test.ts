import { setTimeout as sleep } from 'node:timers/promises';

import type { OutboxRecord } from '@dvt/contracts';
import type { IOutboxStorage, OutboxTickResult } from '@dvt/delivery';
import { InMemoryEventBus } from '@dvt/delivery/testing';
import { describe, expect } from 'vitest';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
} from '../../src/runtime/OutboxWorkerRuntime.js';

import {
  AbortDuringListenerRegistrationSignal,
  CountingHooks,
  assertPresent,
  createLoggerState,
  createMemoryRuntime,
  createSyntheticError,
  enqueuePendingEvents,
  runtimeClock,
  runtimeFailures,
  runtimeScenarios,
  runtimeTest,
  waitForCondition,
} from './runtimeTestSupport.js';

describe('OutboxWorkerRuntime lifecycle', () => {
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
