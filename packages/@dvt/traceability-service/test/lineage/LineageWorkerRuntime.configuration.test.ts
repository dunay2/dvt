import { describe, expect, it } from 'vitest';

import type { ILineageOutboxStore } from '../../src/lineage/contracts.js';
import { LineageWorkerRuntime } from '../../src/lineage/LineageWorkerRuntime.js';

import {
  makeMapper,
  makeSilentLogger,
  makeSink,
  makeStore,
} from './support/lineageRuntimeTestSupport.js';

describe('LineageWorkerRuntime', () => {
  describe('configuration', () => {
    it('rejects auto-replay when tenant scope is missing', () => {
      expect(
        () =>
          new LineageWorkerRuntime(makeStore([]), makeSink(), makeMapper(), makeSilentLogger(), {
            autoReplayEnabled: true,
          })
      ).toThrow('INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required');
    });

    it('rejects dead-letter scope when store cannot count dead letters', () => {
      const storeWithoutDeadLetterCount = {
        ...makeStore([]),
        countDeadLetter: undefined,
      } as unknown as ILineageOutboxStore;

      expect(
        () =>
          new LineageWorkerRuntime(
            storeWithoutDeadLetterCount,
            makeSink(),
            makeMapper(),
            makeSilentLogger(),
            { deadLetterTenantId: 'tenant-a' }
          )
      ).toThrow(
        'INVALID_LINEAGE_RUNTIME_CONFIG: store.countDeadLetter is required for dead-letter scope'
      );
    });

    it('rejects dead-letter alert threshold when tenant scope is missing', () => {
      expect(
        () =>
          new LineageWorkerRuntime(makeStore([]), makeSink(), makeMapper(), makeSilentLogger(), {
            deadLetterAlertThreshold: 1,
          })
      ).toThrow(
        'INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required for dead-letter alerts'
      );
    });

    it('rejects auto-replay when store cannot replay dead letters', () => {
      const storeWithoutReplay = {
        ...makeStore([]),
        replayDeadLetters: undefined,
      } as unknown as ILineageOutboxStore;

      expect(
        () =>
          new LineageWorkerRuntime(
            storeWithoutReplay,
            makeSink(),
            makeMapper(),
            makeSilentLogger(),
            {
              deadLetterTenantId: 'tenant-a',
              autoReplayEnabled: true,
            }
          )
      ).toThrow(
        'INVALID_LINEAGE_RUNTIME_CONFIG: store.replayDeadLetters is required for auto replay'
      );
    });
  });
});
