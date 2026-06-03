/**
 * Owned concern: current-version AR-C2 Prometheus API latency metric names.
 */
export const START_RUN_SLA_METRICS = Object.freeze({
  runStartLatencySeconds: 'dvt_api_run_start_latency_seconds',
  planCompileLatencySeconds: 'dvt_api_plan_compile_latency_seconds',
} as const);
