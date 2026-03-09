export interface MetricLabels {
  readonly [key: string]: string;
}

export interface IOutboxWorkerMetrics {
  incrementCounter(name: string, labels?: MetricLabels): void;
  observeDuration(name: string, durationMs: number, labels?: MetricLabels): void;
  setGauge(name: string, value: number, labels?: MetricLabels): void;
}

export class NoopOutboxWorkerMetrics implements IOutboxWorkerMetrics {
  incrementCounter(_name: string, _labels?: MetricLabels): void {
    return;
  }
  observeDuration(_name: string, _durationMs: number, _labels?: MetricLabels): void {
    return;
  }
  setGauge(_name: string, _value: number, _labels?: MetricLabels): void {
    return;
  }
}
