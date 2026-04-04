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
  recordStartRunLatency(durationMs: number, outcome: StartRunLatencyOutcome): void;
}

export type PlanCompileLatencyOutcome = 'built' | 'manifest_resolution_error' | 'error';

export interface IPlanCompileLatencyTelemetry {
  recordPlanCompileLatency(durationMs: number, outcome: PlanCompileLatencyOutcome): void;
}
