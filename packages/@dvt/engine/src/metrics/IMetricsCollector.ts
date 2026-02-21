/**
 * Minimal structured metrics interface for the DVT engine.
 *
 * Implementations can route calls to StatsD, Prometheus, OpenTelemetry, or
 * any other metrics backend without importing provider-specific SDKs here.
 *
 * All methods are fire-and-forget (no return value) so that a slow or failing
 * metrics backend never blocks the critical path.
 */
export interface IMetricsCollector {
  /**
   * Increments a counter by 1 (or by `value` if provided).
   *
   * Suggested metric names:
   *   `dvt.run.started`          — a run was accepted by the engine
   *   `dvt.run.start_failed`     — startRun threw before adapter call
   *   `dvt.run.cancelled`        — cancelRun completed successfully
   *   `dvt.outbox.delivered`     — outbox records marked delivered
   *   `dvt.outbox.failed`        — outbox records marked failed
   *   `dvt.rate_limit.rejected`  — startRun rejected by outbox rate limiter
   */
  increment(metric: string, tags?: Record<string, string>, value?: number): void;

  /**
   * Records a timing observation in milliseconds.
   *
   * Suggested metric names:
   *   `dvt.run.start_duration_ms`    — wall time for a successful startRun
   *   `dvt.run.status_duration_ms`   — wall time for getRunStatus
   *   `dvt.run.cancel_duration_ms`   — wall time for cancelRun
   */
  timing(metric: string, durationMs: number, tags?: Record<string, string>): void;
}
