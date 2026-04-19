import type { OutboxTickResult } from '@dvt/delivery';
import { describe, expect } from 'vitest';

import { OutboxWorkerRuntime } from '../../src/runtime/OutboxWorkerRuntime.js';

import {
  MemoryOutboxStorage,
  assertPresent,
  createLoggerState,
  createMemoryRuntime,
  createSyntheticError,
  enqueuePendingEvents,
  runtimeFailures,
  runtimeScenarios,
  runtimeTest,
  waitForCondition,
} from './runtimeTestSupport.js';

describe('OutboxWorkerRuntime failure handling', () => {
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
      const hooks = {
        started: false,
        stopped: false,
        onStarted() {
          this.started = true;
        },
        onStopped() {
          this.stopped = true;
        },
      };
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

  runtimeTest(runtimeScenarios.runtimeTreatsHookFailuresAsBestEffortAndKeepsDraining, async () => {
    const { storage, bus, runtime, getWarnCount } = createMemoryRuntime({
      pollIntervalMs: 60_000,
      errorBackoffMs: 25,
      hooks: {
        onStarted() {
          throw createSyntheticError(runtimeFailures.hookStarted);
        },
        onTick() {
          throw createSyntheticError(runtimeFailures.hookTick);
        },
        onStopped() {
          throw createSyntheticError(runtimeFailures.hookStopped);
        },
      },
    });

    await enqueuePendingEvents(storage, 1);

    const loop = runtime.start();
    await waitForCondition(() => bus.published.length === 1);
    await runtime.stop();
    await loop;

    expect((await storage.listPending(10)).length).toBe(0);
    expect(getWarnCount()).toBe(3);
  });
});
