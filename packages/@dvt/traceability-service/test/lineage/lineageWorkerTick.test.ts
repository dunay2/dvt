import { describe, expect, it } from 'vitest';

import { runLineageWorkerTick } from '../../src/lineage/runtime/lineageWorkerTick.js';

import {
  makeMapper,
  makeRecord,
  makeSilentLogger,
  makeSink,
  makeStore,
} from './support/lineageRuntimeTestSupport.js';

describe('runLineageWorkerTick', () => {
  it('coordinates pending records, dead-letter recovery, and summary logging', async () => {
    const store = makeStore([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]);
    store.countDeadLetter.mockResolvedValueOnce(3);
    const logger = makeSilentLogger();

    const outcome = await runLineageWorkerTick({
      autoReplayBatchSize: 7,
      autoReplayEnabled: true,
      batchSize: 2,
      deadLetterAlertThreshold: 2,
      deadLetterTenantId: 'tenant-a',
      logger,
      mapper: makeMapper(),
      sink: makeSink(),
      store,
    });

    expect(outcome).toEqual({
      deadLetterCount: 3,
      result: { processed: 2, deadLettered: 0, lag: 2 },
    });
    expect(store.listPending).toHaveBeenCalledWith(2);
    expect(store.replayDeadLetters).toHaveBeenCalledWith({ tenantId: 'tenant-a', limit: 7 });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        batchSize: 2,
        deadLetterLag: 3,
        deadLetterLagKnown: true,
        deadLettered: 0,
        lag: 2,
        processed: 2,
      }),
      'lineage worker tick'
    );
  });

  it('keeps dead-letter lag unknown when counting fails', async () => {
    const store = makeStore([]);
    store.countDeadLetter.mockRejectedValueOnce(new Error('dead-letter database unavailable'));
    const logger = makeSilentLogger();

    const outcome = await runLineageWorkerTick({
      autoReplayBatchSize: 25,
      autoReplayEnabled: true,
      batchSize: 50,
      deadLetterAlertThreshold: 1,
      deadLetterTenantId: 'tenant-a',
      logger,
      mapper: makeMapper(),
      sink: makeSink(),
      store,
    });

    expect(outcome).toEqual({
      deadLetterCount: null,
      result: { processed: 0, deadLettered: 0, lag: 0 },
    });
    expect(store.replayDeadLetters).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' }),
      'lineage worker: dead-letter count failed'
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        deadLetterLag: null,
        deadLetterLagKnown: false,
      }),
      'lineage worker tick'
    );
  });
});
