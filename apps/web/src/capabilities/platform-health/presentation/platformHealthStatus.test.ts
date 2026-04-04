import { describe, expect, it } from 'vitest';

import { createPlatformHealthSnapshot } from '../testing/platformHealthFixtures';
import {
  getNextRetryDelayMs,
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
} from './platformHealthStatus';

describe('platformHealthStatus', () => {
  it('returns a degraded reason from reconciler health details', () => {
    const snapshot = createPlatformHealthSnapshot({
      healthz: {
        ...createPlatformHealthSnapshot().healthz,
        data: {
          ok: true,
          status: 'degraded',
          components: {
            intentReconciler: {
              status: 'degraded',
              reasonCode: 'runtime_unavailable',
            },
          },
        },
      },
    });

    expect(getPlatformConnectionDetail('degraded', snapshot, null)).toContain(
      'runtime_unavailable'
    );
  });

  it('returns offline detail from query error when offline', () => {
    const snapshot = createPlatformHealthSnapshot();
    const errorMessage = getPlatformHealthErrorMessageFromQuery(
      true,
      new Error('connect ECONNREFUSED')
    );

    expect(getPlatformConnectionDetail('offline', snapshot, errorMessage)).toBe(
      'connect ECONNREFUSED'
    );
  });

  it('caps exponential retry delay at 60 seconds', () => {
    expect(getNextRetryDelayMs(5_000)).toBe(10_000);
    expect(getNextRetryDelayMs(60_000)).toBe(60_000);
    expect(getNextRetryDelayMs(120_000)).toBe(60_000);
  });
});
