import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  ICounter,
  IGauge,
  IHistogram,
  ILogs,
  IManagedObservability,
  IMetrics,
  ITraces,
  LogEntry,
  MetricLabels,
  ObservabilityContext,
} from '@dvt/observability';
import { defaultCardinalityPolicy, validateMetricLabels } from '@dvt/observability';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';

import { ensureOpenTelemetryContextManager, OpenTelemetryTraces } from './OpenTelemetryTraces.js';
import {
  MAX_TRACE_ATTRIBUTE_VALUE_LENGTH,
  normalizeResourceValue,
  parseResourceAttributes,
  resolveTraceEndpoint,
  TRACE_ATTRIBUTE_KEYS,
} from './otelTracePolicy.js';

class NoopCounter implements ICounter {
  constructor(private readonly base: MetricLabels | undefined) {}
  add(_value: number, labels?: MetricLabels): void {
    validateMetricLabels({ ...this.base, ...labels }, defaultCardinalityPolicy);
  }
}

class NoopHistogram implements IHistogram {
  constructor(private readonly base: MetricLabels | undefined) {}
  record(_value: number, labels?: MetricLabels): void {
    validateMetricLabels({ ...this.base, ...labels }, defaultCardinalityPolicy);
  }
}

class NoopGauge implements IGauge {
  constructor(private readonly base: MetricLabels | undefined) {}
  set(_value: number, labels?: MetricLabels): void {
    validateMetricLabels({ ...this.base, ...labels }, defaultCardinalityPolicy);
  }
}

class NoopMetrics implements IMetrics {
  counter(_name: string, baseLabels?: MetricLabels): ICounter {
    validateMetricLabels(baseLabels, defaultCardinalityPolicy);
    return new NoopCounter(baseLabels);
  }
  histogram(_name: string, baseLabels?: MetricLabels): IHistogram {
    validateMetricLabels(baseLabels, defaultCardinalityPolicy);
    return new NoopHistogram(baseLabels);
  }
  gauge(_name: string, baseLabels?: MetricLabels): IGauge {
    validateMetricLabels(baseLabels, defaultCardinalityPolicy);
    return new NoopGauge(baseLabels);
  }
}

class JsonConsoleLogs implements ILogs {
  constructor(private readonly readCurrentContext: () => ObservabilityContext | undefined) {}

  debug(entry: Omit<LogEntry, 'level'>): void {
    this.emit({ ...entry, level: 'debug' });
  }
  info(entry: Omit<LogEntry, 'level'>): void {
    this.emit({ ...entry, level: 'info' });
  }
  warn(entry: Omit<LogEntry, 'level'>): void {
    this.emit({ ...entry, level: 'warn' });
  }
  error(entry: Omit<LogEntry, 'level'>): void {
    this.emit({ ...entry, level: 'error' });
  }

  private emit(entry: LogEntry): void {
    const context = entry.context ?? this.readCurrentContext();
    const emittedEntry = context === undefined ? entry : { ...entry, context };

    // Logs remain on the existing structured JSON transport; this slice only binds traces to OTel.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(emittedEntry));
  }
}

export interface OtelObservabilityOptions {
  readonly serviceName: string;
  readonly otlpEndpoint?: string;
  readonly resourceAttributes?: string;
  readonly spanExporter?: SpanExporter;
}

export class OtelObservability implements IManagedObservability {
  readonly metrics: IMetrics;
  readonly traces: ITraces;
  readonly logs: ILogs;

  private readonly contextStorage = new AsyncLocalStorage<ObservabilityContext>();
  private readonly tracerProvider: BasicTracerProvider;

  constructor(options: OtelObservabilityOptions) {
    ensureOpenTelemetryContextManager();
    const exporter = options.spanExporter ?? createOtlpExporter(options.otlpEndpoint);
    this.tracerProvider = new BasicTracerProvider({
      resource: resourceFromAttributes({
        'service.name': normalizeResourceValue(options.serviceName),
        ...parseResourceAttributes(options.resourceAttributes),
      }),
      spanProcessors: [new BatchSpanProcessor(exporter)],
      generalLimits: {
        attributeCountLimit: TRACE_ATTRIBUTE_KEYS.size,
        attributeValueLengthLimit: MAX_TRACE_ATTRIBUTE_VALUE_LENGTH,
      },
    });
    this.metrics = new NoopMetrics();
    this.traces = new OpenTelemetryTraces(this.tracerProvider.getTracer('@dvt/observability-otel'));
    this.logs = new JsonConsoleLogs(() => this.contextStorage.getStore());
  }

  withContext<T>(ctx: ObservabilityContext, fn: () => T): T {
    return this.contextStorage.run(ctx, fn);
  }

  async forceFlush(): Promise<void> {
    try {
      await this.tracerProvider.forceFlush();
    } catch {
      // Exporter health is diagnostic and cannot alter runtime outcomes.
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.tracerProvider.shutdown();
    } catch {
      // Exporter shutdown failure cannot alter process-domain outcomes.
    }
  }
}

function createOtlpExporter(endpoint: string | undefined): SpanExporter {
  return endpoint === undefined
    ? new OTLPTraceExporter()
    : new OTLPTraceExporter({ url: resolveTraceEndpoint(endpoint) });
}
