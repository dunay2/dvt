import type { ILineageOutboxStore, ILineageSink, LineageOutboxRecord } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  LineageWorkerRuntime,
  type LineageStepEventMapper,
  type LineageWorkerRuntimeLogger,
} from '../src/application/LineageWorkerRuntime.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<LineageOutboxRecord> = {}): LineageOutboxRecord {
  return {
    id: overrides.id ?? 'lox-run-1-1-0',
    runId: overrides.runId ?? 'run-1',
    eventType: overrides.eventType ?? 'StepStarted',
    payload:
      overrides.payload ??
      ({
        eventType: 'StepStarted',
        runId: 'run-1',
        eventSequence: 1,
      } as unknown as LineageOutboxRecord['payload']),
    attempts: overrides.attempts ?? 0,
    createdAt: overrides.createdAt ?? '2026-03-15T00:00:00.000Z',
  };
}

function makeSilentLogger(): LineageWorkerRuntimeLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeStore(pending: LineageOutboxRecord[] = []): ILineageOutboxStore & {
  markDelivered: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  deadLetter: ReturnType<typeof vi.fn>;
} {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
    listPending: vi.fn().mockResolvedValue(pending),
    markDelivered: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    deadLetter: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMapper(supports = true): LineageStepEventMapper {
  return {
    supports: vi.fn().mockReturnValue(supports),
    map: vi.fn().mockResolvedValue({ jobFacets: { sql: { query: 'SELECT 1' } }, warnings: [] }),
  };
}

function makeSink(throwError?: Error): ILineageSink {
  return {
    publish: throwError
      ? vi.fn().mockRejectedValue(throwError)
      : vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// runOnce
// ---------------------------------------------------------------------------

describe('LineageWorkerRuntime', () => {
  describe('runOnce', () => {
    it('returns zero lag/processed/deadLettered when no pending records', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), makeSilentLogger());
      const result = await runtime.runOnce();
      expect(result).toEqual({ processed: 0, deadLettered: 0, lag: 0 });
    });

    it('maps and publishes each pending record, calls markDelivered', async () => {
      const records = [
        makeRecord({ id: 'r1', runId: 'run-1' }),
        makeRecord({ id: 'r2', runId: 'run-2' }),
      ];
      const store = makeStore(records);
      const sink = makeSink();
      const mapper = makeMapper();
      const runtime = new LineageWorkerRuntime(store, sink, mapper, makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(2);
      expect(result.lag).toBe(2);
      expect(sink.publish).toHaveBeenCalledTimes(2);
      expect(store.markDelivered).toHaveBeenCalledWith(['r1']);
      expect(store.markDelivered).toHaveBeenCalledWith(['r2']);
    });

    it('skips records mapper does not support, marks them delivered', async () => {
      const record = makeRecord({ id: 'r1' });
      const store = makeStore([record]);
      const mapper = makeMapper(false);
      const sink = makeSink();
      const runtime = new LineageWorkerRuntime(store, sink, mapper, makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(0);
      expect(sink.publish).not.toHaveBeenCalled();
      expect(store.markDelivered).toHaveBeenCalledWith(['r1']);
    });

    it('increments attempts and calls markFailed on sink failure below max', async () => {
      const record = makeRecord({ id: 'r1', attempts: 1 });
      const store = makeStore([record]);
      const sink = makeSink(new Error('publish error'));
      const runtime = new LineageWorkerRuntime(store, sink, makeMapper(), makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(0);
      expect(store.markFailed).toHaveBeenCalledWith('r1', 'publish error', 2);
      expect(store.deadLetter).not.toHaveBeenCalled();
    });

    it('moves to dead letter when attempts reaches MAX_LINEAGE_ATTEMPTS', async () => {
      const record = makeRecord({ id: 'r1', attempts: 4 }); // next = 5 = MAX
      const store = makeStore([record]);
      const sink = makeSink(new Error('still failing'));
      const runtime = new LineageWorkerRuntime(store, sink, makeMapper(), makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.deadLettered).toBe(1);
      expect(store.deadLetter).toHaveBeenCalledWith('r1', 'still failing');
      expect(store.markFailed).not.toHaveBeenCalled();
    });

    it('continues processing remaining records when one fails', async () => {
      const records = [
        makeRecord({ id: 'r1', runId: 'run-1' }),
        makeRecord({ id: 'r2', runId: 'run-2' }),
        makeRecord({ id: 'r3', runId: 'run-3' }),
      ];
      const store = makeStore(records);
      const sink: ILineageSink = {
        publish: vi.fn().mockImplementation(({ runId }: { runId: string }) => {
          if (runId === 'run-2') return Promise.reject(new Error('fail'));
          return Promise.resolve();
        }),
      };
      const runtime = new LineageWorkerRuntime(store, sink, makeMapper(), makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(2);
      expect(store.markDelivered).toHaveBeenCalledWith(['r1']);
      expect(store.markDelivered).toHaveBeenCalledWith(['r3']);
      expect(store.markFailed).toHaveBeenCalledWith('r2', 'fail', 1);
    });

    it('exposes lagCount via getter after runOnce', async () => {
      const store = makeStore([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]);
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), makeSilentLogger());

      await runtime.runOnce();

      expect(runtime.lagCount).toBe(2);
    });

    it('passes batchSize from options to listPending', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        {
          batchSize: 23,
        }
      );

      await runtime.runOnce();

      expect(store.listPending).toHaveBeenCalledWith(23);
    });
  });

  describe('start / stop', () => {
    it('resolves immediately when started with an already-aborted signal', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        {
          pollIntervalMs: 100,
        }
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
        {
          pollIntervalMs: 60_000,
        }
      );

      const loopPromise = runtime.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      await runtime.stop();
      await loopPromise;

      expect(store.listPending).toHaveBeenCalled();
    });

    it('stop is idempotent when called on a stopped runtime', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        {
          pollIntervalMs: 60_000,
        }
      );

      await runtime.stop();
      await runtime.stop();
    });
  });

  describe('LineageOutboxObserver', () => {
    it('enqueues StepStarted events to lineage store on delivery', async () => {
      const { LineageOutboxObserver } = await import('../src/application/LineageOutboxObserver.js');
      const lineageStore = makeStore();
      const observer = new LineageOutboxObserver(lineageStore);

      await observer.onRecordDelivered?.({
        id: 'ob-1',
        createdAt: '2026-03-15T00:00:00.000Z',
        idempotencyKey: 'ik-1',
        payload: {
          eventType: 'StepStarted',
          runId: 'run-1',
          eventSequence: 1,
        } as unknown as Parameters<typeof observer.onRecordDelivered>[0]['payload'],
        attempts: 0,
      });

      expect(lineageStore.enqueue).toHaveBeenCalledOnce();
    });

    it('does NOT enqueue non-StepStarted events', async () => {
      const { LineageOutboxObserver } = await import('../src/application/LineageOutboxObserver.js');
      const lineageStore = makeStore();
      const observer = new LineageOutboxObserver(lineageStore);

      await observer.onRecordDelivered?.({
        id: 'ob-2',
        createdAt: '2026-03-15T00:00:00.000Z',
        idempotencyKey: 'ik-2',
        payload: {
          eventType: 'RunCompleted',
          runId: 'run-1',
          eventSequence: 2,
        } as unknown as Parameters<typeof observer.onRecordDelivered>[0]['payload'],
        attempts: 0,
      });

      expect(lineageStore.enqueue).not.toHaveBeenCalled();
    });

    it('swallows enqueue errors (fail-open)', async () => {
      const { LineageOutboxObserver } = await import('../src/application/LineageOutboxObserver.js');
      const lineageStore = {
        ...makeStore(),
        enqueue: vi.fn().mockRejectedValue(new Error('db down')),
      };
      const logger = makeSilentLogger();
      const observer = new LineageOutboxObserver(lineageStore, logger);

      await expect(
        observer.onRecordDelivered?.({
          id: 'ob-3',
          createdAt: '2026-03-15T00:00:00.000Z',
          idempotencyKey: 'ik-3',
          payload: {
            eventType: 'StepStarted',
            runId: 'run-1',
            eventSequence: 1,
          } as unknown as Parameters<typeof observer.onRecordDelivered>[0]['payload'],
          attempts: 0,
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
