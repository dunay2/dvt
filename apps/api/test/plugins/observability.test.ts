import { describe, it, expect } from 'vitest';

import { buildObservability } from '../../src/plugins/observability.js';

type ObservabilityEnv = Parameters<typeof buildObservability>[0];

function baseEnv(overrides?: Partial<ObservabilityEnv>): ObservabilityEnv {
  return {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '127.0.0.1',
    LOG_LEVEL: 'info',
    CORS_ORIGIN: '*',
    DATABASE_URL: undefined,
    DVT_PG_SCHEMA: 'dvt',
    DVT_PG_STATEMENT_TIMEOUT_MS: 0,
    DVT_PG_QUERY_TIMEOUT_MS: 0,
    DVT_START_RUN_BACKPRESSURE_MODE: 'off',
    DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT: 100,
    DVT_START_RUN_MAX_OUTBOX_LAG_MS: 300000,
    DVT_START_RUN_STUCK_EVENT_AGE_THRESHOLD_MS: 604800000,
    DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS: 1000,
    DVT_START_RUN_RETRY_AFTER_SECONDS: 30,
    DVT_OUTBOX_SHARD_COUNT: 1,
    DVT_INTENT_RECONCILER_ENABLED: false,
    DVT_INTENT_RECONCILER_INTERVAL_MS: 30000,
    DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS: 300000,
    DVT_INTENT_RECONCILER_LIMIT: 50,
    DVT_INTENT_RECONCILER_BACKOFF_BASE_MS: 1000,
    DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: 60000,
    DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: 20000,
    DVT_INTENT_RECONCILER_PROVIDERS: 'mock',
    DVT_READYZ_ENABLED: false,
    DVT_VERSION_ENABLED: false,
    DVT_DB_READY_ENABLED: false,
    SERVICE_NAME: 'dvt-api-test',
    OBS_ENABLED: false,
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_SERVICE_NAME: undefined,
    OTEL_RESOURCE_ATTRIBUTES: undefined,
    OIDC_ALGORITHMS: 'RS256',
    DVT_ADMIN_ROUTES_ENABLED: false,
    ...overrides,
  };
}

describe('buildObservability', () => {
  it('returns no-op implementation when OBS_ENABLED=false', () => {
    const obs = buildObservability(baseEnv({ OBS_ENABLED: false }));
    expect(typeof obs.withContext).toBe('function');
    expect(() => obs.metrics.counter('test.counter').add(1)).not.toThrow();
  });

  it('returns OTel implementation when OBS_ENABLED=true', () => {
    const obs = buildObservability(
      baseEnv({
        OBS_ENABLED: true,
        OTEL_SERVICE_NAME: 'my-service',
      })
    );
    expect(typeof obs.withContext).toBe('function');
    expect(typeof obs.traces.startSpan).toBe('function');
  });
});
