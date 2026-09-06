import { ArtifactReadError } from '@dvt/artifacts';
import { describe, expect, it, vi } from 'vitest';

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

  it('projects generic structured error metadata in fail-open warnings', async () => {
    const artifactError = new ArtifactReadError(
      'ARTIFACT_NOT_FOUND',
      'lineage artifact could not be found'
    );
    const lineageStore = {
      ...makeStore(),
      enqueue: vi.fn().mockRejectedValue(artifactError),
    };
    const logger = makeSilentLogger();
    const observer = new LineageOutboxObserver(lineageStore, logger);

    await observer.onRecordDelivered(makeRecord({ id: 'ob-4' }));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: {
          code: 'ARTIFACT_NOT_FOUND',
          message: 'lineage artifact could not be found',
          name: 'ArtifactReadError',
        },
        eventType: 'StepStarted',
        runId: 'run-1',
      }),
      LINEAGE_LOG_MESSAGE.OUTBOX_ENQUEUE_FAILED_FAIL_OPEN
    );
  });
});
