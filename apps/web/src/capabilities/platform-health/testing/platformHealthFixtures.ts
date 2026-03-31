import type {
  OptionalEndpointProbe,
  PlatformDatabaseReadiness,
  PlatformEndpointFailure,
  PlatformHealthInfo,
  PlatformHealthSnapshot,
  PlatformReadinessInfo,
  PlatformVersionInfo,
  RequiredEndpointProbe,
} from '../domain/platformHealthTypes';

export function createPlatformEndpointFailure(
  overrides: Partial<PlatformEndpointFailure> = {}
): PlatformEndpointFailure {
  return {
    kind: 'network',
    message: 'platform endpoint unavailable',
    statusCode: null,
    ...overrides,
  };
}

export function createHealthzProbe(
  overrides: Partial<RequiredEndpointProbe<PlatformHealthInfo>> = {}
): RequiredEndpointProbe<PlatformHealthInfo> {
  return {
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
    ...overrides,
  };
}

export function createReadyzProbe(
  overrides: Partial<OptionalEndpointProbe<PlatformReadinessInfo>> = {}
): OptionalEndpointProbe<PlatformReadinessInfo> {
  return {
    endpoint: '/readyz',
    availability: 'available',
    statusCode: 200,
    latencyMs: 5,
    data: {
      ok: true,
      status: 'ready',
    },
    error: null,
    ...overrides,
  };
}

export function createVersionProbe(
  overrides: Partial<OptionalEndpointProbe<PlatformVersionInfo>> = {}
): OptionalEndpointProbe<PlatformVersionInfo> {
  return {
    endpoint: '/version',
    availability: 'available',
    statusCode: 200,
    latencyMs: 5,
    data: {
      name: 'dvt-api',
      version: '1.0.0',
    },
    error: null,
    ...overrides,
  };
}

export function createDbReadyProbe(
  overrides: Partial<OptionalEndpointProbe<PlatformDatabaseReadiness>> = {}
): OptionalEndpointProbe<PlatformDatabaseReadiness> {
  return {
    endpoint: '/db/ready',
    availability: 'available',
    statusCode: 200,
    latencyMs: 5,
    data: {
      ok: true,
      reason: null,
    },
    error: null,
    ...overrides,
  };
}

export function createPlatformHealthSnapshot(
  overrides: Partial<PlatformHealthSnapshot> = {}
): PlatformHealthSnapshot {
  return {
    fetchedAt: '2026-03-31T00:00:00.000Z',
    apiBaseUrl: 'http://localhost:3000',
    dataSourceMode: 'api',
    healthz: createHealthzProbe(),
    readyz: createReadyzProbe(),
    version: createVersionProbe(),
    dbReady: createDbReadyProbe(),
    ...overrides,
  };
}
