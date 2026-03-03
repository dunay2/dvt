import assert from 'node:assert/strict';
import test from 'node:test';

import { buildObservability } from './observability.js';
import type { Env } from './env.js';

function baseEnv(overrides?: Partial<Env>): Env {
  return {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '127.0.0.1',
    LOG_LEVEL: 'info',
    CORS_ORIGIN: '*',
    DATABASE_URL: undefined,
    SERVICE_NAME: 'dvt-api-test',
    OBS_ENABLED: false,
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_SERVICE_NAME: undefined,
    OTEL_RESOURCE_ATTRIBUTES: undefined,
    ...(overrides ?? {}),
  };
}

test('buildObservability returns no-op implementation when OBS_ENABLED=false', () => {
  const obs = buildObservability(baseEnv({ OBS_ENABLED: false }));
  assert.equal(typeof obs.withContext, 'function');
  assert.doesNotThrow(() => obs.metrics.counter('test.counter').add(1));
});

test('buildObservability returns OTel implementation when OBS_ENABLED=true', () => {
  const obs = buildObservability(
    baseEnv({
      OBS_ENABLED: true,
      OTEL_SERVICE_NAME: 'my-service',
    })
  );
  assert.equal(typeof obs.withContext, 'function');
  assert.equal(typeof obs.traces.startSpan, 'function');
});
