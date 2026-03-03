import type { Attributes, MetricLabels, ObservabilityContext } from './ObservabilityContext';

export interface ICounter {
  add(value: number, labels?: MetricLabels): void;
}

export interface IHistogram {
  record(value: number, labels?: MetricLabels): void;
}

export interface IGauge {
  set(value: number, labels?: MetricLabels): void;
}

export interface IMetrics {
  counter(name: string, baseLabels?: MetricLabels): ICounter;
  histogram(name: string, baseLabels?: MetricLabels): IHistogram;
  gauge(name: string, baseLabels?: MetricLabels): IGauge;
}

export type SpanStatus = 'ok' | 'error';

export interface ISpan {
  setAttribute(key: string, value: unknown): void;
  setAttributes(attrs: Attributes): void;

  recordException(err: unknown): void;
  setStatus(status: SpanStatus, message?: string): void;

  end(): void;
}

export interface SpanOptions {
  readonly context?: ObservabilityContext;
  readonly attributes?: Attributes;
}

export interface ITraces {
  startSpan(name: string, options?: SpanOptions): ISpan;
  withSpan<T>(name: string, options: SpanOptions | undefined, fn: (span: ISpan) => T): T;
}

export interface LogEntry {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly msg: string;
  readonly context?: ObservabilityContext;
  readonly attributes?: Attributes;
  readonly err?: unknown;
}

export interface ILogs {
  debug(entry: Omit<LogEntry, 'level'>): void;
  info(entry: Omit<LogEntry, 'level'>): void;
  warn(entry: Omit<LogEntry, 'level'>): void;
  error(entry: Omit<LogEntry, 'level'>): void;
}

export interface IObservability {
  readonly metrics: IMetrics;
  readonly traces: ITraces;
  readonly logs: ILogs;

  withContext<T>(ctx: ObservabilityContext, fn: () => T): T;
}
