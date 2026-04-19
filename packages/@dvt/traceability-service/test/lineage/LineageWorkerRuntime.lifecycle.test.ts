import { describe, expect, it } from 'vitest';

import { LineageWorkerRuntime } from '../../src/lineage/LineageWorkerRuntime.js';

import {
  makeMapper,
  makeRecord,
  makeSilentLogger,
  makeSink,
  makeStore,
} from './support/lineageRuntimeTestSupport.js';

describe('LineageWorkerRuntime', () => {
  describe('start / stop', () => {
    it('resolves immediately when started with an already-aborted signal', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        { pollIntervalMs: 100 }
      );
      const controller = new globalThis.AbortController();
      controller.abort();

      await runtime.start(controller.signal);
    });

    it('runs at least one tick before stop is called', async () => {
      const store = makeStore([makeRecord()]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        { pollIntervalMs: 60_000 }
      );

      const loopPromise = runtime.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await runtime.stop();
      await loopPromise;

      expect(store.listPending).toHaveBeenCalled();
    });

    it('stop is idempotent when called on a stopped runtime', async () => {
      const runtime = new LineageWorkerRuntime(
        makeStore([]),
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        { pollIntervalMs: 60_000 }
      );

      await runtime.stop();
      await runtime.stop();
    });
  });
});
