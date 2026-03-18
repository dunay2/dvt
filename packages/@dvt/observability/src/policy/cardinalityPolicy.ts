import type { MetricLabels } from '../contracts/ObservabilityContext.js';

export interface CardinalityPolicy {
  readonly forbiddenLabelKeys: ReadonlySet<string>;
  readonly maxLabelKeyLength: number;
  readonly maxLabelValueLength: number;
}

const DEFAULT_FORBIDDEN = new Set<string>(['runId', 'stepId', 'planId', 'attemptId', 'userId']);

export const defaultCardinalityPolicy: CardinalityPolicy = {
  forbiddenLabelKeys: DEFAULT_FORBIDDEN,
  maxLabelKeyLength: 64,
  maxLabelValueLength: 128,
};

export function validateMetricLabels(
  labels: MetricLabels | undefined,
  policy: CardinalityPolicy
): void {
  if (!labels) return;

  for (const [k, v] of Object.entries(labels)) {
    if (policy.forbiddenLabelKeys.has(k)) {
      throw new Error(`Forbidden metric label key: ${k} (high-cardinality)`);
    }
    if (k.length > policy.maxLabelKeyLength) {
      throw new Error(`Metric label key too long: ${k}`);
    }
    if (v.length > policy.maxLabelValueLength) {
      throw new Error(`Metric label value too long for key ${k}`);
    }
  }
}
