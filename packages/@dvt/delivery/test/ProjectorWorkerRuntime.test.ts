import { describe, expect, it, vi } from 'vitest';

import {
  ProjectorWorkerRuntime,
  type ProjectorStateStore,
  type ProjectorWorkerRuntimeLogger,
} from '../src/application/ProjectorWorkerRuntime.js';

function makeStaleRun(runId: string, tenantId = 'tenant-1'): { runId: string; tenantId: string } {
  return { runId, tenantId };
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
  });

  describe('start / stop', () => {
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
