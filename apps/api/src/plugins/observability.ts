import type { IObservability } from '@dvt/observability';
import { createNoopObservability } from '@dvt/observability';
import { OtelObservability } from '@dvt/observability-otel';

import type { Env } from './env.js';

export function buildObservability(env: Env): IObservability {
  if (!env.OBS_ENABLED) {
    return createNoopObservability();
  }

  return new OtelObservability({
    serviceName: env.OTEL_SERVICE_NAME ?? env.SERVICE_NAME,
    ...(env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? { otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
      : {}),
    ...(env.OTEL_RESOURCE_ATTRIBUTES
      ? { resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES }
      : {}),
  });
}
