import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import type {
  ReconcilerHealthStaleWindow,
  ReconcilerHealthTransition,
} from './reconcilerHealthStateMachine.js';
import {
  RECONCILER_RUNTIME_EVENTS,
  RECONCILER_RUNTIME_METRICS,
} from './reconcilerRuntimeTelemetry.js';

export function emitReconcilerHealthTransitionMonitoring(
  transition: ReconcilerHealthTransition,
  observability: IObservability,
  logger: FastifyBaseLogger,
  window: ReconcilerHealthStaleWindow
): void {
  if (transition.reason !== 'runtime_unavailable_stale') return;

  observability.metrics.counter(RECONCILER_RUNTIME_METRICS.healthStaleTotal).add(1);
  logger.error({
    event: RECONCILER_RUNTIME_EVENTS.healthStale,
    staleMs: window.staleMs,
    lastSweepSignalAtMs: window.lastSweepSignalAtMs,
    nowMs: window.nowMs,
  });
}
