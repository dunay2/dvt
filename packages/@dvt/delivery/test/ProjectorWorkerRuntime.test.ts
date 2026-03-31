import { describe, expect, it, vi } from 'vitest';

import {
  ProjectorWorkerRuntime,
  type ProjectorStateStore,
  type ProjectorWorkerRuntimeLogger,
} from '../src/application/ProjectorWorkerRuntime.js';

function makeStaleRun(
  runId: string,
  tenantId = 'tenant-1',
  claimToken?: string
): { runId: string; tenantId: string; claimToken?: string } {
  return { runId, tenantId, claimToken };
}

function makeSilentLogger(): ProjectorWorkerRuntimeLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeStateStore(
  staleRuns: Array<{ runId: string; tenantId: string }> = [],
  rebuildFn?: (tenantId: string, runId: string) => Promise<unknown>
): ProjectorStateStore {
  return {
    listStaleSnapshotRuns: vi.fn().mockResolvedValue(staleRuns),
    rebuildSnapshot: rebuildFn ?? vi.fn().mockResolvedValue(undefined),
  };
}

describe('ProjectorWorkerRuntime', () => {
  describe('constructor validation', () => {
    it('rejects batchSize that is not a positive integer finite number', () => {
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            batchSize: 0,
          })
      ).toThrow('INVALID_BATCH_SIZE');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            batchSize: -1,
          })
      ).toThrow('INVALID_BATCH_SIZE');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            batchSize: 1.5,
          })
      ).toThrow('INVALID_BATCH_SIZE');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            batchSize: Number.NaN,
          })
      ).toThrow('INVALID_BATCH_SIZE');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            batchSize: Number.POSITIVE_INFINITY,
          })
      ).toThrow('INVALID_BATCH_SIZE');
    });

    it('rejects fallbackPollEveryTicks = 0', () => {
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            fallbackPollEveryTicks: 0,
          })
      ).toThrow('INVALID_FALLBACK_POLL_EVERY_TICKS');
    });

    it('rejects fallbackPollEveryTicks < 0', () => {
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            fallbackPollEveryTicks: -1,
          })
      ).toThrow('INVALID_FALLBACK_POLL_EVERY_TICKS');
    });

    it('rejects fallbackPollEveryTicks that is not an integer finite number', () => {
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            fallbackPollEveryTicks: 1.5,
          })
      ).toThrow('INVALID_FALLBACK_POLL_EVERY_TICKS');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            fallbackPollEveryTicks: Number.NaN,
          })
      ).toThrow('INVALID_FALLBACK_POLL_EVERY_TICKS');
      expect(
        () =>
          new ProjectorWorkerRuntime(makeStateStore([]), makeSilentLogger(), {
            fallbackPollEveryTicks: Number.POSITIVE_INFINITY,
          })
      ).toThrow('INVALID_FALLBACK_POLL_EVERY_TICKS');
    });
  });

  describe('runOnce', () => {
    it('returns zero lag and zero processed when the store has no stale runs', async () => {
      const store = makeStateStore([]);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger());
      const result = await runtime.runOnce();
      expect(result).toEqual({ processed: 0, lag: 0 });
    });

    it('skips the tick gracefully when the state store does not expose stale probing', async () => {
      const logger = makeSilentLogger();
      const runtime = new ProjectorWorkerRuntime(
        {
          rebuildSnapshot: vi.fn().mockResolvedValue(undefined),
        },
        logger
      );

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 0, lag: 0 });
      expect(logger.info).toHaveBeenCalledOnce();
    });

    it('calls rebuildSnapshot for each stale run and increments processed', async () => {
      const stale = [makeStaleRun('run-1'), makeStaleRun('run-2')];
      const rebuild = vi.fn().mockResolvedValue(undefined);
      const store = makeStateStore(stale, rebuild);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(2);
      expect(result.lag).toBe(2);
      expect(rebuild).toHaveBeenCalledWith('tenant-1', 'run-1');
      expect(rebuild).toHaveBeenCalledWith('tenant-1', 'run-2');
    });

    it('continues processing remaining runs when one rebuildSnapshot fails', async () => {
      const stale = [makeStaleRun('run-1'), makeStaleRun('run-2'), makeStaleRun('run-3')];
      const rebuild = vi.fn().mockImplementation((_tenantId: string, runId: string) => {
        if (runId === 'run-2') {
          return Promise.reject(new Error('rebuild failed'));
        }
        return Promise.resolve(undefined);
      });
      const logger = makeSilentLogger();
      const store = makeStateStore(stale, rebuild);
      const runtime = new ProjectorWorkerRuntime(store, logger);

      const result = await runtime.runOnce();

      expect(result.processed).toBe(2);
      expect(result.lag).toBe(3);
      expect(logger.error).toHaveBeenCalledOnce();
    });

    it('exposes lagCount via getter after runOnce', async () => {
      const stale = [makeStaleRun('run-1'), makeStaleRun('run-2')];
      const store = makeStateStore(stale);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger());

      await runtime.runOnce();

      expect(runtime.lagCount).toBe(2);
    });

    it('passes batchSize from options to listStaleSnapshotRuns', async () => {
      const store = makeStateStore([]);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), { batchSize: 17 });

      await runtime.runOnce();

      expect(store.listStaleSnapshotRuns).toHaveBeenCalledWith(17);
    });

    it('prefers push-based claimSnapshotWork when available', async () => {
      const rebuild = vi.fn().mockResolvedValue(undefined);
      const completeSnapshotWork = vi.fn().mockResolvedValue(undefined);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([
            makeStaleRun('run-1', 'tenant-1', 'claim-token-1'),
            makeStaleRun('run-2', 'tenant-1', 'claim-token-2'),
          ]),
        listStaleSnapshotRuns: vi.fn().mockResolvedValue([makeStaleRun('run-legacy')]),
        rebuildSnapshot: rebuild,
        completeSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), { batchSize: 9 });

      const result = await runtime.runOnce();

      expect(store.claimSnapshotWork).toHaveBeenCalledWith(9);
      expect(store.listStaleSnapshotRuns).toHaveBeenCalledWith(7);
      expect(result).toEqual({ processed: 3, lag: 3 });
      expect(rebuild).toHaveBeenCalledTimes(3);
      expect(completeSnapshotWork).toHaveBeenCalledTimes(2);
    });

    it('passes claim token to completeSnapshotWork for queue-claimed work', async () => {
      const completeSnapshotWork = vi.fn().mockResolvedValue(undefined);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([makeStaleRun('run-1', 'tenant-1', 'claim-token-1')]),
        rebuildSnapshot: vi.fn().mockResolvedValue(undefined),
        completeSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), { batchSize: 5 });

      await runtime.runOnce();

      expect(completeSnapshotWork).toHaveBeenCalledWith('tenant-1', 'run-1', 'claim-token-1');
    });

    it('treats claim ownership loss on complete as non-fatal after rebuild', async () => {
      const rebuildSnapshot = vi.fn().mockResolvedValue(undefined);
      const completeSnapshotWork = vi
        .fn()
        .mockRejectedValue(new Error('SNAPSHOT_WORK_CLAIM_NOT_OWNED: tenant-1/run-1'));
      const failSnapshotWork = vi.fn().mockResolvedValue(undefined);
      const logger = makeSilentLogger();
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([makeStaleRun('run-1', 'tenant-1', 'claim-token-1')]),
        rebuildSnapshot,
        completeSnapshotWork,
        failSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, logger, { batchSize: 5 });

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 1, lag: 1 });
      expect(rebuildSnapshot).toHaveBeenCalledWith('tenant-1', 'run-1');
      expect(failSnapshotWork).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('skips rebuild when isSnapshotStale reports false for queued work', async () => {
      const rebuild = vi.fn().mockResolvedValue(undefined);
      const completeSnapshotWork = vi.fn().mockResolvedValue(undefined);
      const isSnapshotStale = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([
            makeStaleRun('run-1', 'tenant-1', 'claim-token-1'),
            makeStaleRun('run-2', 'tenant-1', 'claim-token-2'),
          ]),
        rebuildSnapshot: rebuild,
        isSnapshotStale,
        completeSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), { batchSize: 5 });

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 1, lag: 1 });
      expect(isSnapshotStale).toHaveBeenNthCalledWith(1, 'tenant-1', 'run-1');
      expect(isSnapshotStale).toHaveBeenNthCalledWith(2, 'tenant-1', 'run-2');
      expect(rebuild).toHaveBeenCalledTimes(1);
      expect(rebuild).toHaveBeenCalledWith('tenant-1', 'run-2');
      expect(completeSnapshotWork).toHaveBeenCalledTimes(2);
    });

    it('calls failSnapshotWork when queue-claimed rebuild fails', async () => {
      const rebuild = vi.fn().mockRejectedValue(new Error('boom'));
      const failSnapshotWork = vi.fn().mockResolvedValue(undefined);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi.fn().mockResolvedValue([makeStaleRun('run-1', 'tenant-1', 'ct-1')]),
        rebuildSnapshot: rebuild,
        failSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        batchSize: 5,
        errorBackoffMs: 4321,
      });

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 0, lag: 1 });
      expect(failSnapshotWork).toHaveBeenCalledWith('tenant-1', 'run-1', 4321, 'boom', 'ct-1');
    });

    it('treats claim ownership loss on failSnapshotWork as non-fatal release race', async () => {
      const rebuild = vi.fn().mockRejectedValue(new Error('boom'));
      const failSnapshotWork = vi
        .fn()
        .mockRejectedValue(new Error('SNAPSHOT_WORK_CLAIM_NOT_OWNED: tenant-1/run-1'));
      const logger = makeSilentLogger();
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi.fn().mockResolvedValue([makeStaleRun('run-1', 'tenant-1', 'ct-1')]),
        rebuildSnapshot: rebuild,
        failSnapshotWork,
      };
      const runtime = new ProjectorWorkerRuntime(store, logger, {
        batchSize: 5,
        errorBackoffMs: 4321,
      });

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 0, lag: 1 });
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('falls back to listStaleSnapshotRuns to fill uncovered stale work', async () => {
      const rebuild = vi.fn().mockResolvedValue(undefined);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([makeStaleRun('run-queue', 'tenant-1', 'claim-token-queue')]),
        listStaleSnapshotRuns: vi.fn().mockResolvedValue([makeStaleRun('run-poll')]),
        rebuildSnapshot: rebuild,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), { batchSize: 2 });

      const result = await runtime.runOnce();

      expect(store.claimSnapshotWork).toHaveBeenCalledWith(2);
      expect(store.listStaleSnapshotRuns).toHaveBeenCalledWith(1);
      expect(result).toEqual({ processed: 2, lag: 2 });
      expect(rebuild).toHaveBeenCalledWith('tenant-1', 'run-queue');
      expect(rebuild).toHaveBeenCalledWith('tenant-1', 'run-poll');
    });

    it('does not run fallback polling every tick when queue mode is enabled', async () => {
      const rebuild = vi.fn().mockResolvedValue(undefined);
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([makeStaleRun('run-queue', 'tenant-1', 'claim-token-queue')]),
        listStaleSnapshotRuns: vi.fn().mockResolvedValue([makeStaleRun('run-poll')]),
        rebuildSnapshot: rebuild,
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        batchSize: 2,
        fallbackPollEveryTicks: 3,
      });

      await runtime.runOnce(); // tick 1 -> poll allowed
      await runtime.runOnce(); // tick 2 -> poll skipped
      await runtime.runOnce(); // tick 3 -> poll allowed

      expect(store.listStaleSnapshotRuns).toHaveBeenCalledTimes(2);
      expect(store.listStaleSnapshotRuns).toHaveBeenNthCalledWith(1, 1);
      expect(store.listStaleSnapshotRuns).toHaveBeenNthCalledWith(2, 1);
    });
  });

  describe('start / stop', () => {
    it('skips queue item when claim token is missing and logs an error', async () => {
      const logger = makeSilentLogger();
      const rebuildSnapshot = vi.fn().mockResolvedValue(undefined);
      const store = {
        claimSnapshotWork: vi.fn().mockResolvedValue([{ runId: 'run-1', tenantId: 'tenant-1' }]),
        rebuildSnapshot,
      } as unknown as ProjectorStateStore;
      const runtime = new ProjectorWorkerRuntime(store, logger, { batchSize: 2 });

      const result = await runtime.runOnce();

      expect(result).toEqual({ processed: 0, lag: 0 });
      expect(rebuildSnapshot).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('resets fallback polling cadence across start-stop cycles', async () => {
      const store: ProjectorStateStore = {
        claimSnapshotWork: vi
          .fn()
          .mockResolvedValue([makeStaleRun('run-queue', 'tenant-1', 'claim-token-queue')]),
        listStaleSnapshotRuns: vi.fn().mockResolvedValue([makeStaleRun('run-poll')]),
        rebuildSnapshot: vi.fn().mockResolvedValue(undefined),
      };
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        pollIntervalMs: 60_000,
        batchSize: 2,
        fallbackPollEveryTicks: 3,
      });

      const firstLoop = runtime.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await runtime.stop();
      await firstLoop;

      const secondLoop = runtime.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await runtime.stop();
      await secondLoop;

      expect(store.listStaleSnapshotRuns).toHaveBeenCalledTimes(2);
    });

    it('resolves immediately when started with an already-aborted signal', async () => {
      const store = makeStateStore([]);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        pollIntervalMs: 100,
      });
      const controller = new globalThis.AbortController();
      controller.abort();

      await runtime.start(controller.signal);
    });

    it('runs at least one tick before stop is called', async () => {
      const store = makeStateStore([makeStaleRun('run-1')]);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        pollIntervalMs: 60_000,
        batchSize: 10,
      });

      const loopPromise = runtime.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await runtime.stop();
      await loopPromise;

      expect(store.listStaleSnapshotRuns).toHaveBeenCalled();
    });

    it('stop is idempotent when called on a stopped runtime', async () => {
      const store = makeStateStore([]);
      const runtime = new ProjectorWorkerRuntime(store, makeSilentLogger(), {
        pollIntervalMs: 60_000,
      });

      await runtime.stop();
      await runtime.stop();
    });
  });
});
