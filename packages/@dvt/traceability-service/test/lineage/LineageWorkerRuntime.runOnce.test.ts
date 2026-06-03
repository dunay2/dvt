import { describe, expect, it, vi } from 'vitest';

import type { ILineageSink } from '../../src/lineage/contracts.js';
import { LineageWorkerRuntime } from '../../src/lineage/LineageWorkerRuntime.js';

import {
  makeMapper,
  makeRecord,
  makeSilentLogger,
  makeSink,
  makeStore,
} from './support/lineageRuntimeTestSupport.js';

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

    it('surfaces markDelivered failure when skipping unsupported records', async () => {
      const record = makeRecord({ id: 'r-skip-fail' });
      const store = makeStore([record]);
      store.markDelivered.mockRejectedValueOnce(new Error('markDelivered down'));
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(false),
        makeSilentLogger()
      );

      await expect(runtime.runOnce()).rejects.toThrow('markDelivered down');
      expect(store.markFailed).not.toHaveBeenCalled();
    });

    it('preserves observed lag when processing fails after pending count', async () => {
      const record = makeRecord({ id: 'r-skip-fail' });
      const store = makeStore([record]);
      store.countPending.mockResolvedValueOnce(17);
      store.markDelivered.mockRejectedValueOnce(new Error('markDelivered down'));
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(false),
        makeSilentLogger()
      );

      await expect(runtime.runOnce()).rejects.toThrow('markDelivered down');

      expect(runtime.lagCount).toBe(17);
    });

    it('increments attempts and calls markFailed on sink failure below max', async () => {
      const record = makeRecord({ id: 'r1', attempts: 1 });
      const store = makeStore([record]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(new Error('publish error')),
        makeMapper(),
        makeSilentLogger()
      );

      const result = await runtime.runOnce();

      expect(result.processed).toBe(0);
      expect(store.markFailed).toHaveBeenCalledWith('r1', 'publish error');
    });

    it('moves to dead letter when the store reports max-attempt exhaustion', async () => {
      const record = makeRecord({ id: 'r1', attempts: 4 });
      const store = makeStore([record]);
      store.markFailed.mockResolvedValueOnce('dead_lettered');
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(new Error('still failing')),
        makeMapper(),
        makeSilentLogger()
      );

      const result = await runtime.runOnce();

      expect(result.deadLettered).toBe(1);
      expect(store.markFailed).toHaveBeenCalledWith('r1', 'still failing');
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
          if (runId === 'run-2') {
            return Promise.reject(new Error('fail'));
          }

          return Promise.resolve();
        }),
      };
      const runtime = new LineageWorkerRuntime(store, sink, makeMapper(), makeSilentLogger());

      const result = await runtime.runOnce();

      expect(result.processed).toBe(2);
      expect(store.markDelivered).toHaveBeenCalledWith(['r1']);
      expect(store.markDelivered).toHaveBeenCalledWith(['r3']);
      expect(store.markFailed).toHaveBeenCalledWith('r2', 'fail');
    });

    it('exposes lagCount via getter after runOnce', async () => {
      const store = makeStore([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]);
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), makeSilentLogger());

      await runtime.runOnce();

      expect(runtime.lagCount).toBe(2);
    });

    it('uses countPending when available to report uncapped lag', async () => {
      const store = makeStore([makeRecord({ id: 'r1' })]);
      store.countPending.mockResolvedValueOnce(99);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        { batchSize: 1 }
      );

      const result = await runtime.runOnce();

      expect(result.lag).toBe(99);
      expect(runtime.lagCount).toBe(99);
    });

    it('passes batchSize from options to listPending', async () => {
      const store = makeStore([]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(),
        makeMapper(),
        makeSilentLogger(),
        { batchSize: 23 }
      );

      await runtime.runOnce();

      expect(store.listPending).toHaveBeenCalledWith(23);
    });

    it('emits dead-letter backlog alert when threshold is reached', async () => {
      const store = makeStore([]);
      store.countDeadLetter.mockResolvedValueOnce(4);
      const logger = makeSilentLogger();
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), logger, {
        deadLetterTenantId: 'tenant-a',
        deadLetterAlertThreshold: 3,
      });

      await runtime.runOnce();

      expect(store.countDeadLetter).toHaveBeenCalledWith('tenant-a');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-a',
          deadLetterLag: 4,
          deadLetterAlertThreshold: 3,
        }),
        'lineage worker: dead-letter backlog threshold reached'
      );
      expect(runtime.deadLetterCount).toBe(4);
    });

    it('preserves observed dead-letter lag when summary logging fails after counting', async () => {
      const store = makeStore([]);
      store.countDeadLetter.mockResolvedValueOnce(4);
      const logger = makeSilentLogger();
      logger.info = vi.fn(() => {
        throw new Error('logger unavailable');
      });
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), logger, {
        deadLetterTenantId: 'tenant-a',
      });

      await expect(runtime.runOnce()).rejects.toThrow('logger unavailable');

      expect(runtime.deadLetterCount).toBe(4);
    });

    it('replays dead letters automatically when enabled and backlog exists', async () => {
      const store = makeStore([]);
      store.countDeadLetter.mockResolvedValueOnce(2);
      store.replayDeadLetters.mockResolvedValueOnce(2);
      const logger = makeSilentLogger();
      const runtime = new LineageWorkerRuntime(store, makeSink(), makeMapper(), logger, {
        deadLetterTenantId: 'tenant-a',
        autoReplayEnabled: true,
        autoReplayBatchSize: 7,
      });

      await runtime.runOnce();

      expect(store.replayDeadLetters).toHaveBeenCalledWith({ tenantId: 'tenant-a', limit: 7 });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          moved: 2,
          tenantId: 'tenant-a',
          replayBatchSize: 7,
          deadLetterLagBeforeReplay: 2,
        }),
        'lineage worker: automatic dead-letter replay moved records back to pending'
      );
    });

    it('sanitizes sensitive error fragments before persisting last_error', async () => {
      const record = makeRecord({ id: 'r-secret' });
      const store = makeStore([record]);
      const runtime = new LineageWorkerRuntime(
        store,
        makeSink(new Error('publish failed token=abc123 bearer qwerty password=hunter2')),
        makeMapper(),
        makeSilentLogger()
      );

      await runtime.runOnce();

      expect(store.markFailed).toHaveBeenCalledWith(
        'r-secret',
        'publish failed token=[REDACTED] bearer [REDACTED] password=[REDACTED]'
      );
    });

    it('redacts sensitive fragments in structured warning logs', async () => {
      const record = makeRecord({ id: 'r-log-secret' });
      const store = makeStore([record]);
      const sink: ILineageSink = {
        publish: vi.fn().mockRejectedValue({ token: 'abc123', password: 'hunter2' }),
      };
      const logger = makeSilentLogger();
      const runtime = new LineageWorkerRuntime(store, sink, makeMapper(), logger);

      await runtime.runOnce();

      expect(logger.warn).toHaveBeenCalled();
      const firstWarnCall = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0];
      const firstWarnPayload = firstWarnCall?.[0] as { err?: { message?: string } };
      expect(firstWarnPayload?.err?.message).toContain('[REDACTED]');
      expect(firstWarnPayload?.err?.message).not.toContain('abc123');
      expect(firstWarnPayload?.err?.message).not.toContain('hunter2');
    });
  });
});
