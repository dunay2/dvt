export const RECONCILER_RUNTIME_EVENTS = Object.freeze({
  bootstrapFailed: 'api.reconciler.bootstrap.failed',
  shutdownFailed: 'api.reconciler.shutdown.failed',
  healthStale: 'api.reconciler.health.stale',
} as const);

export const RECONCILER_RUNTIME_METRICS = Object.freeze({
  healthStaleTotal: 'dvt.intent.reconcile.health_stale_total',
} as const);
