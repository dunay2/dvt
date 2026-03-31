import { describe, expect, it } from 'vitest';

import { selectPlatformConnectionState } from './platformHealthSelectors';
import type { PlatformHealthSnapshot } from './platformHealthTypes';

function createHealthySnapshot(): PlatformHealthSnapshot {
  return {
    fetchedAt: '2026-03-31T00:00:00.000Z',
    apiBaseUrl: 'http://localhost:3000',
    dataSourceMode: 'api',
    healthz: {
      endpoint: '/healthz',
      availability: 'available',
      statusCode: 200,
      latencyMs: 5,
      data: {
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'healthy',
          },
        },
      },
      error: null,
    },
    readyz: {
      endpoint: '/readyz',
      availability: 'available',
      statusCode: 200,
      latencyMs: 5,
      data: {
        ok: true,
        status: 'ready',
      },
      error: null,
    },
    version: {
      endpoint: '/version',
      availability: 'available',
      statusCode: 200,
      latencyMs: 5,
      data: {
        name: 'dvt-api',
        version: '1.0.0',
      },
      error: null,
    },
    dbReady: {
      endpoint: '/db/ready',
      availability: 'available',
      statusCode: 200,
      latencyMs: 5,
      data: {
        ok: true,
        reason: null,
      },
      error: null,
    },
  };
}

describe('selectPlatformConnectionState', () => {
  it('returns offline when the query failed or has no snapshot', () => {
    expect(selectPlatformConnectionState(undefined, true)).toEqual({
      rest: 'offline',
      liveEvents: 'disconnected',
    });
    expect(selectPlatformConnectionState(undefined, false)).toEqual({
      rest: 'offline',
      liveEvents: 'disconnected',
    });
  });

  it('returns ok when the platform snapshot is healthy', () => {
    expect(selectPlatformConnectionState(createHealthySnapshot(), false)).toEqual({
      rest: 'ok',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when /healthz reports degraded state', () => {
    const snapshot = createHealthySnapshot();
    snapshot.healthz.data = {
      ok: true,
      status: 'degraded',
      components: {
        intentReconciler: {
          status: 'degraded',
          reasonCode: 'runtime_unavailable',
        },
      },
    };

    expect(selectPlatformConnectionState(snapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when readiness or db probes show degraded state', () => {
    const readinessSnapshot = createHealthySnapshot();
    readinessSnapshot.readyz.data = {
      ok: false,
      status: 'not_ready',
      reasonCode: 'reconciler_degraded',
    };

    expect(selectPlatformConnectionState(readinessSnapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });

    const dbSnapshot = createHealthySnapshot();
    dbSnapshot.dbReady.data = {
      ok: false,
      reason: 'database unavailable',
    };

    expect(selectPlatformConnectionState(dbSnapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when an optional endpoint has a transport or protocol failure', () => {
    const snapshot = createHealthySnapshot();
    snapshot.version.error = {
      kind: 'invalid_json',
      message: '/version returned a non-JSON response',
      statusCode: 200,
    };
    snapshot.version.data = null;

    expect(selectPlatformConnectionState(snapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });
});
