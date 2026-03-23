import type {
  ICounter,
  IGauge,
  IHistogram,
  ILogs,
  IMetrics,
  IObservability,
  ISpan,
  ITraces,
  LogEntry,
  SpanOptions,
  SpanStatus,
} from './contracts/IObservability.js';
import type {
  Attributes,
  MetricLabels,
  ObservabilityContext,
} from './contracts/ObservabilityContext.js';

class NoopCounter implements ICounter {
  add(_value: number, _labels?: MetricLabels): void {
    // intentionally no-op
  }
}

class NoopHistogram implements IHistogram {
  record(_value: number, _labels?: MetricLabels): void {
    // intentionally no-op
  }
}

class NoopGauge implements IGauge {
  set(_value: number, _labels?: MetricLabels): void {
    // intentionally no-op
  }
}

class NoopMetrics implements IMetrics {
  counter(_name: string, _baseLabels?: MetricLabels): ICounter {
    // intentionally no-op
    return new NoopCounter();
  }

  histogram(_name: string, _baseLabels?: MetricLabels): IHistogram {
    // intentionally no-op
    return new NoopHistogram();
  }

  gauge(_name: string, _baseLabels?: MetricLabels): IGauge {
    // intentionally no-op
    return new NoopGauge();
  }
}

class NoopSpan implements ISpan {
  setAttribute(_key: string, _value: unknown): void {
    // intentionally no-op
  }
  setAttributes(_attrs: Attributes): void {
    // intentionally no-op
  }
  recordException(_err: unknown): void {
    // intentionally no-op
  }
  setStatus(_status: SpanStatus, _message?: string): void {
    // intentionally no-op
  }
  end(): void {
    return;
  }
}

class NoopTraces implements ITraces {
  startSpan(_name: string, _options?: SpanOptions): ISpan {
    // intentionally no-op
    return new NoopSpan();
  }

  withSpan<T>(_name: string, _options: SpanOptions | undefined, fn: (span: ISpan) => T): T {
    const span = new NoopSpan();
    try {
      return fn(span);
    } finally {
      span.end();
    }
  }
}

class NoopLogs implements ILogs {
  debug(_entry: Omit<LogEntry, 'level'>): void {
    // intentionally no-op
  }
  info(_entry: Omit<LogEntry, 'level'>): void {
    // intentionally no-op
  }
  warn(_entry: Omit<LogEntry, 'level'>): void {
    // intentionally no-op
  }
  error(_entry: Omit<LogEntry, 'level'>): void {
    // intentionally no-op
  }
}

export function createNoopObservability(): IObservability {
  return {
    metrics: new NoopMetrics(),
    traces: new NoopTraces(),
    logs: new NoopLogs(),
    withContext<T>(_ctx: ObservabilityContext, fn: () => T): T {
      return fn();
    },
  };
}
