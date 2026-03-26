import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import type { ReconcilerHealthState } from './reconcilerHealth.js';

const RECONCILER_HEALTH_EVENTS = {
  stale: 'api.reconciler.health.stale',
} as const;

export type ReconcilerHealthReadContext = {
  getIntentReconcilerHealth: () => ReconcilerHealthState;
  setIntentReconcilerHealth: (health: ReconcilerHealthState) => void;
  observability: IObservability;
};

export type ReconcilerHealthStaleWindow = {
  staleMs: number;
  lastSweepSignalAtMs: number;
  nowMs: number;
};

export function shouldMarkReconcilerRuntimeUnavailable(
  current: ReconcilerHealthState,
  window: ReconcilerHealthStaleWindow
): boolean {
  if (current.status === 'disabled' || current.status === 'degraded') {
    return false;
  }
  return window.nowMs - window.lastSweepSignalAtMs > window.staleMs;
}

export function evaluateAndMarkReconcilerHealthStale(
  ctx: ReconcilerHealthReadContext,
  logger: FastifyBaseLogger,
  window: ReconcilerHealthStaleWindow
): boolean {
  const currentHealth = ctx.getIntentReconcilerHealth();
  if (!shouldMarkReconcilerRuntimeUnavailable(currentHealth, window)) {
    return false;
  }
  ctx.setIntentReconcilerHealth({ status: 'degraded', reasonCode: 'runtime_unavailable' });
  ctx.observability.metrics.counter('dvt.intent.reconcile.health_stale_total').add(1);
  logger.error({
    event: RECONCILER_HEALTH_EVENTS.stale,
    staleMs: window.staleMs,
    lastSweepSignalAtMs: window.lastSweepSignalAtMs,
    nowMs: window.nowMs,
  });
  return true;
}
