import {
  RECONCILER_HEALTH_REASON_CODE,
  RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthState,
} from './reconcilerHealth.js';

export type ReconcilerHealthStaleWindow = {
  staleMs: number;
  lastSweepSignalAtMs: number;
  nowMs: number;
};

export type ReconcilerHealthTransitionReason = 'runtime_unavailable_stale';

export type ReconcilerHealthTransition = {
  nextHealth: ReconcilerHealthState;
  reason: ReconcilerHealthTransitionReason;
};

export function shouldMarkReconcilerRuntimeUnavailable(
  current: ReconcilerHealthState,
  window: ReconcilerHealthStaleWindow
): boolean {
  if (
    current.status === RECONCILER_HEALTH_STATUS.disabled ||
    current.status === RECONCILER_HEALTH_STATUS.degraded
  ) {
    return false;
  }
  return window.nowMs - window.lastSweepSignalAtMs > window.staleMs;
}

export function evaluateReconcilerHealthStaleTransition(
  currentHealth: ReconcilerHealthState,
  window: ReconcilerHealthStaleWindow
): ReconcilerHealthTransition | null {
  if (!shouldMarkReconcilerRuntimeUnavailable(currentHealth, window)) {
    return null;
  }
  return {
    nextHealth: {
      status: RECONCILER_HEALTH_STATUS.degraded,
      reasonCode: RECONCILER_HEALTH_REASON_CODE.runtimeUnavailable,
    },
    reason: 'runtime_unavailable_stale',
  };
}
