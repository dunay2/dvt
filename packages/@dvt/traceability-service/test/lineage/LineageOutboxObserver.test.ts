import { describe, expect, it, vi } from 'vitest';

import { LINEAGE_ERROR_CODE, LINEAGE_ERROR_MESSAGE_KEY } from '../../src/lineage/errorContract.js';
import { CompiledCodeNotFoundError } from '../../src/lineage/errors.js';
import { LineageOutboxObserver } from '../../src/lineage/LineageOutboxObserver.js';
import { LINEAGE_LOG_MESSAGE } from '../../src/lineage/logMessages.js';

import { makeRecord, makeSilentLogger, makeStore } from './support/lineageRuntimeTestSupport.js';

describe('LineageOutboxObserver', () => {
  it('enqueues StepStarted events to lineage store on delivery', async () => {
    const lineageStore = makeStore();
    const observer = new LineageOutboxObserver(lineageStore);

    await observer.onRecordDelivered(makeRecord());

    expect(lineageStore.enqueue).toHaveBeenCalledOnce();
  });

  it('does NOT enqueue non-StepStarted events', async () => {
    const lineageStore = makeStore();
    const observer = new LineageOutboxObserver(lineageStore);

    await observer.onRecordDelivered(
      makeRecord({
        id: 'ob-2',
        payload: {
          eventType: 'RunCompleted',
          runId: 'run-1',
          eventSequence: 2,
        } as unknown as ReturnType<typeof makeRecord>['payload'],
      })
    );

    expect(lineageStore.enqueue).not.toHaveBeenCalled();
  });

  it('swallows enqueue errors (fail-open)', async () => {
    const lineageStore = {
      ...makeStore(),
      enqueue: vi.fn().mockRejectedValue(new Error('db down')),
    };
    const logger = makeSilentLogger();
    const observer = new LineageOutboxObserver(lineageStore, logger);

    await expect(observer.onRecordDelivered(makeRecord({ id: 'ob-3' }))).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('projects structured lineage error metadata in fail-open warnings', async () => {
    const lineageError = new CompiledCodeNotFoundError({
      storageUri: 'memory://compiled/missing.sql',
    });
    const lineageStore = {
      ...makeStore(),
      enqueue: vi.fn().mockRejectedValue(lineageError),
    };
    const logger = makeSilentLogger();
    const observer = new LineageOutboxObserver(lineageStore, logger);

    await observer.onRecordDelivered(makeRecord({ id: 'ob-4' }));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: {
          code: LINEAGE_ERROR_CODE.COMPILED_CODE_NOT_FOUND,
          message: 'Compiled code not found for URI: memory://compiled/missing.sql',
          messageKey: LINEAGE_ERROR_MESSAGE_KEY.COMPILED_CODE_NOT_FOUND,
          messageParams: { storageUri: 'memory://compiled/missing.sql' },
          name: 'CompiledCodeNotFoundError',
        },
        eventType: 'StepStarted',
        runId: 'run-1',
      }),
      LINEAGE_LOG_MESSAGE.OUTBOX_ENQUEUE_FAILED_FAIL_OPEN
    );
  });
});
