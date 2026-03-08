import type {
  Attributes,
  ICounter,
  IGauge,
  IHistogram,
  ILogs,
  IMetrics,
  IObservability,
  ISpan,
  ITraces,
  LogEntry,
  MetricLabels,
  ObservabilityContext,
  SpanOptions,
  SpanStatus,
} from '@dvt/observability';
import { defaultCardinalityPolicy, validateMetricLabels } from '@dvt/observability';

// NOTE: This is a scaffold. Replace the placeholder implementations with OpenTelemetry SDK bindings.
// The goal is strict typing and an adapter boundary that can be tested.

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

class NoopSpan implements ISpan {
  private ended = false;
  setAttribute(_key: string, _value: unknown): void {
    // noop — replace with OTel span.setAttribute when wired
  }
  setAttributes(_attrs: Attributes): void {
    // noop — replace with OTel span.setAttributes when wired
  }
  recordException(_err: unknown): void {
    // noop — replace with OTel span.recordException when wired
  }
  setStatus(_status: SpanStatus, _message?: string): void {
    // noop — replace with OTel span.setStatus when wired
  }
  end(): void {
    if (this.ended) return;
    this.ended = true;
  }
}

class NoopTraces implements ITraces {
  startSpan(_name: string, _options?: SpanOptions): ISpan {
    return new NoopSpan();
  }
  withSpan<T>(name: string, options: SpanOptions | undefined, fn: (span: ISpan) => T): T {
    const span = this.startSpan(name, options);
    try {
      return fn(span);
    } finally {
      span.end();
    }
  }
}

class JsonConsoleLogs implements ILogs {
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
    // Replace with OTel Logs API if/when adopted.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export interface OtelObservabilityOptions {
  readonly serviceName: string;
  readonly otlpEndpoint?: string;
  readonly resourceAttributes?: string;
}

export class OtelObservability implements IObservability {
  readonly metrics: IMetrics;
  readonly traces: ITraces;
  readonly logs: ILogs;

  private currentContext: ObservabilityContext | undefined;

  constructor(_options: OtelObservabilityOptions) {
    this.metrics = new NoopMetrics();
    this.traces = new NoopTraces();
    this.logs = new JsonConsoleLogs();
  }

  withContext<T>(ctx: ObservabilityContext, fn: () => T): T {
    const prev = this.currentContext;
    this.currentContext = ctx;
    try {
      return fn();
    } finally {
      this.currentContext = prev;
    }
  }
}
