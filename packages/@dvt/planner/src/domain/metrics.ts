/**
 * ADR baseline: ADR-0005-metrics
 *
 * Metrics are OPTIONAL and MUST NOT affect determinism.
 * They are invoked as side-effect callbacks owned by the caller.
 */
export interface PlannerMetrics {
  recordDuration(ms: number): void;
  recordNodeCount(count: number): void;
  recordPlanSize(bytes: number): void;
  recordFailure(code: string): void;
}

export const NoopPlannerMetrics: PlannerMetrics = {
  recordDuration: () => undefined,
  recordNodeCount: () => undefined,
  recordPlanSize: () => undefined,
  recordFailure: () => undefined,
};
