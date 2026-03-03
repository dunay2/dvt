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
} from './contracts/IObservability';
import type {
  Attributes,
  MetricLabels,
  ObservabilityContext,
} from './contracts/ObservabilityContext';

class NoopCounter implements ICounter {
  add(_value: number, _labels?: MetricLabels): void {}
}

class NoopHistogram implements IHistogram {
  record(_value: number, _labels?: MetricLabels): void {}
}

class NoopGauge implements IGauge {
  set(_value: number, _labels?: MetricLabels): void {}
}

class NoopMetrics implements IMetrics {
  counter(_name: string, _baseLabels?: MetricLabels): ICounter {
    return new NoopCounter();
  }

  histogram(_name: string, _baseLabels?: MetricLabels): IHistogram {
    return new NoopHistogram();
  }

  gauge(_name: string, _baseLabels?: MetricLabels): IGauge {
    return new NoopGauge();
  }
}

class NoopSpan implements ISpan {
  setAttribute(_key: string, _value: unknown): void {}
  setAttributes(_attrs: Attributes): void {}
  recordException(_err: unknown): void {}
  setStatus(_status: SpanStatus, _message?: string): void {}
  end(): void {}
}

class NoopTraces implements ITraces {
  startSpan(_name: string, _options?: SpanOptions): ISpan {
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
  debug(_entry: Omit<LogEntry, 'level'>): void {}
  info(_entry: Omit<LogEntry, 'level'>): void {}
  warn(_entry: Omit<LogEntry, 'level'>): void {}
  error(_entry: Omit<LogEntry, 'level'>): void {}
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
