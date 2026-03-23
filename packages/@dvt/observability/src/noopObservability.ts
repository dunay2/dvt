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
    void _value;
    void _labels;
  }
}

class NoopHistogram implements IHistogram {
  record(_value: number, _labels?: MetricLabels): void {
    void _value;
    void _labels;
  }
}

class NoopGauge implements IGauge {
  set(_value: number, _labels?: MetricLabels): void {
    void _value;
    void _labels;
  }
}

class NoopMetrics implements IMetrics {
  counter(_name: string, _baseLabels?: MetricLabels): ICounter {
    void _name;
    void _baseLabels;
    return new NoopCounter();
  }

  histogram(_name: string, _baseLabels?: MetricLabels): IHistogram {
    void _name;
    void _baseLabels;
    return new NoopHistogram();
  }

  gauge(_name: string, _baseLabels?: MetricLabels): IGauge {
    void _name;
    void _baseLabels;
    return new NoopGauge();
  }
}

class NoopSpan implements ISpan {
  setAttribute(_key: string, _value: unknown): void {
    void _key;
    void _value;
  }
  setAttributes(_attrs: Attributes): void {
    void _attrs;
  }
  recordException(_err: unknown): void {
    void _err;
  }
  setStatus(_status: SpanStatus, _message?: string): void {
    void _status;
    void _message;
  }
  end(): void {
    return;
  }
}

class NoopTraces implements ITraces {
  startSpan(_name: string, _options?: SpanOptions): ISpan {
    void _name;
    void _options;
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
    void _entry;
  }
  info(_entry: Omit<LogEntry, 'level'>): void {
    void _entry;
  }
  warn(_entry: Omit<LogEntry, 'level'>): void {
    void _entry;
  }
  error(_entry: Omit<LogEntry, 'level'>): void {
    void _entry;
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
