import {
  RECONCILER_HEALTH_STATUS as RUNTIME_RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthReasonCode,
  type ReconcilerHealthState,
} from '../runtime/reconcilerHealth.js';

import {
  NON_DEGRADED_RECONCILER_STATUS_VALUES,
  OVERALL_HEALTH_STATUS,
  RECONCILER_HEALTH_STATUS as CONTRACT_RECONCILER_HEALTH_STATUS,
} from './healthContract.js';

export type PublicIntentReconcilerHealth =
  | {
      status: (typeof NON_DEGRADED_RECONCILER_STATUS_VALUES)[number];
    }
  | {
      status: (typeof CONTRACT_RECONCILER_HEALTH_STATUS)['degraded'];
      reasonCode: ReconcilerHealthReasonCode;
    };

export function mapReconcilerToOverallHealthStatus(
  reconciler: ReconcilerHealthState
): (typeof OVERALL_HEALTH_STATUS)[keyof typeof OVERALL_HEALTH_STATUS] {
  return reconciler.status === RUNTIME_RECONCILER_HEALTH_STATUS.degraded
    ? OVERALL_HEALTH_STATUS.degraded
    : OVERALL_HEALTH_STATUS.healthy;
}

export function mapReconcilerToPublicIntentReconcilerHealth(
  reconciler: ReconcilerHealthState
): PublicIntentReconcilerHealth {
  if (reconciler.status !== RUNTIME_RECONCILER_HEALTH_STATUS.degraded) {
    return { status: reconciler.status };
  }
  return {
    status: CONTRACT_RECONCILER_HEALTH_STATUS.degraded,
    reasonCode: reconciler.reasonCode,
  };
}
