import type { IObservability } from '@dvt/observability';
import observabilityPkg from '@dvt/observability';
import otelPkg from '@dvt/observability-otel';

import type { Env } from './env.js';

export function buildObservability(env: Env): IObservability {
  const { createNoopObservability } = observabilityPkg as {
    createNoopObservability: () => IObservability;
  };

  if (!env.OBS_ENABLED) {
    return createNoopObservability();
  }

  const { OtelObservability } = otelPkg as {
    OtelObservability: new (options: {
      serviceName: string;
      otlpEndpoint?: string;
      resourceAttributes?: string;
    }) => IObservability;
  };

  return new OtelObservability({
    serviceName: env.OTEL_SERVICE_NAME ?? env.SERVICE_NAME,
    ...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
    ...(env.OTEL_RESOURCE_ATTRIBUTES ? { resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES } : {}),
  });
}
