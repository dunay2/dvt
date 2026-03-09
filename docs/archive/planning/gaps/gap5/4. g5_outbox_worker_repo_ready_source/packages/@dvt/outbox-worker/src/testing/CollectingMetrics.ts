import type { IOutboxWorkerMetrics, MetricLabels } from '../contracts/IMetrics.js';

export class CollectingMetrics implements IOutboxWorkerMetrics {
  public readonly counters = new Map<string, number>();
  public readonly gauges = new Map<string, number>();

  incrementCounter(name: string, _labels?: MetricLabels): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  observeDuration(_name: string, _durationMs: number, _labels?: MetricLabels): void {
    return;
  }

  setGauge(name: string, value: number, _labels?: MetricLabels): void {
    this.gauges.set(name, value);
  }
}
