/**
 * Owned concern: AR-C2 API SLA latency port semantics and bounded outcome labels.
 */
export type StartRunLatencyOutcome =
  | 'unauthenticated'
  | 'unauthorized'
  | 'accepted'
  | 'duplicate'
  | 'tenant_backpressure'
  | 'system_backpressure'
  | 'rate_limited'
  | 'plan_rejected'
  | 'engine_error'
  | 'exception';

export interface IStartRunLatencyTelemetry {
  recordStartRunLatency(durationSeconds: number, outcome: StartRunLatencyOutcome): void;
}

export type PlanCompileLatencyOutcome = 'built' | 'manifest_resolution_error' | 'error';

export interface IPlanCompileLatencyTelemetry {
  recordPlanCompileLatency(durationSeconds: number, outcome: PlanCompileLatencyOutcome): void;
}
