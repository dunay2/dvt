import { describe, expect, it } from 'vitest';

import {
  createDbReadyProbe,
  createHealthzProbe,
  createPlatformEndpointFailure,
  createPlatformHealthSnapshot,
  createReadyzProbe,
  createVersionProbe,
} from '../testing/platformHealthFixtures';
import { isPlatformReady, selectPlatformConnectionState } from './platformHealthSelectors';

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
    expect(selectPlatformConnectionState(createPlatformHealthSnapshot(), false)).toEqual({
      rest: 'ok',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when /healthz reports degraded state', () => {
    const snapshot = createPlatformHealthSnapshot({
      healthz: createHealthzProbe({
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
      }),
    });

    expect(selectPlatformConnectionState(snapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when readiness or db probes show degraded state', () => {
    const readinessSnapshot = createPlatformHealthSnapshot({
      readyz: createReadyzProbe({
        data: {
          ok: false,
          status: 'not_ready',
          reasonCode: 'reconciler_degraded',
        },
      }),
    });

    expect(selectPlatformConnectionState(readinessSnapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });

    const dbSnapshot = createPlatformHealthSnapshot({
      dbReady: createDbReadyProbe({
        data: {
          ok: false,
          reason: 'database unavailable',
        },
      }),
    });

    expect(selectPlatformConnectionState(dbSnapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });

  it('returns degraded when an optional endpoint has a transport or protocol failure', () => {
    const snapshot = createPlatformHealthSnapshot({
      version: createVersionProbe({
        data: null,
        error: createPlatformEndpointFailure({
          kind: 'invalid_json',
          message: '/version returned a non-JSON response',
          statusCode: 200,
        }),
      }),
    });

    expect(selectPlatformConnectionState(snapshot, false)).toEqual({
      rest: 'degraded',
      liveEvents: 'polling',
    });
  });
});

describe('isPlatformReady', () => {
  it('returns false when there is no snapshot', () => {
    expect(isPlatformReady(undefined)).toBe(false);
  });

  it('returns true for a healthy snapshot', () => {
    expect(isPlatformReady(createPlatformHealthSnapshot())).toBe(true);
  });

  it('returns false when /healthz is degraded', () => {
    const snapshot = createPlatformHealthSnapshot({
      healthz: createHealthzProbe({
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
      }),
    });

    expect(isPlatformReady(snapshot)).toBe(false);
  });

  it('returns false when readiness or database probes report unavailable state', () => {
    const readinessSnapshot = createPlatformHealthSnapshot({
      readyz: createReadyzProbe({
        data: {
          ok: false,
          status: 'not_ready',
          reasonCode: 'reconciler_degraded',
        },
      }),
    });
    const dbSnapshot = createPlatformHealthSnapshot({
      dbReady: createDbReadyProbe({
        data: {
          ok: false,
          reason: 'database unavailable',
        },
      }),
    });

    expect(isPlatformReady(readinessSnapshot)).toBe(false);
    expect(isPlatformReady(dbSnapshot)).toBe(false);
  });

  it('returns false when /db/ready has a transport or protocol failure', () => {
    const snapshot = createPlatformHealthSnapshot({
      dbReady: createDbReadyProbe({
        data: null,
        error: createPlatformEndpointFailure({
          kind: 'network',
          message: '/db/ready failed to respond',
          statusCode: null,
        }),
      }),
    });

    expect(isPlatformReady(snapshot)).toBe(false);
  });

  it('treats optional disabled probes as ready when healthz remains healthy', () => {
    const snapshot = createPlatformHealthSnapshot({
      readyz: createReadyzProbe({
        availability: 'not_enabled',
        statusCode: 404,
        data: null,
      }),
      dbReady: createDbReadyProbe({
        availability: 'not_enabled',
        statusCode: 404,
        data: null,
      }),
    });

    expect(isPlatformReady(snapshot)).toBe(true);
  });
});
