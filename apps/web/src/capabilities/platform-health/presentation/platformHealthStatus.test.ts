import { describe, expect, it } from 'vitest';

import { createPlatformHealthSnapshot } from '../testing/platformHealthFixtures';
import {
  buildShellHealthPresentationModel,
  getNextRetryDelayMs,
  getShellHealthPollingIntervalMs,
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

  it('uses exponential polling backoff for offline health failures', () => {
    expect(getShellHealthPollingIntervalMs(undefined, true, 1)).toBe(5_000);
    expect(getShellHealthPollingIntervalMs(undefined, true, 2)).toBe(10_000);
    expect(getShellHealthPollingIntervalMs(undefined, true, 5)).toBe(60_000);
  });

  it('builds a checking model before the first settled query', () => {
    const model = buildShellHealthPresentationModel({
      data: undefined,
      isError: false,
      error: null,
      isPending: true,
      isFetching: true,
      failureCount: 0,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
    });

    expect(model.connectionState).toBeNull();
    expect(model.isInitialHealthCheckPending).toBe(true);
    expect(model.connectionDetail).toBeNull();
  });

  it('keeps a failed initial health probe settled while a retry is pending', () => {
    const model = buildShellHealthPresentationModel({
      data: undefined,
      isError: false,
      error: null,
      isPending: true,
      isFetching: true,
      failureCount: 1,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
    });

    expect(model.connectionState).toEqual({
      rest: 'offline',
      liveEvents: 'disconnected',
    });
    expect(model.isInitialHealthCheckPending).toBe(false);
    expect(model.connectionDetail).toBe('Unable to reach /healthz.');
  });
});
