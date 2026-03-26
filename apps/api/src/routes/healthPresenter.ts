import {
  RECONCILER_HEALTH_REASON_CODE,
  RECONCILER_HEALTH_STATUS as RUNTIME_RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthReasonCode,
  type ReconcilerHealthState,
} from '../runtime/reconcilerHealth.js';

import {
  OVERALL_HEALTH_STATUS,
  RECONCILER_HEALTH_STATUS as CONTRACT_RECONCILER_HEALTH_STATUS,
} from './healthContract.js';

type PublicIntentReconcilerHealth =
  | {
      status: (typeof CONTRACT_RECONCILER_HEALTH_STATUS)[keyof typeof CONTRACT_RECONCILER_HEALTH_STATUS];
    }
  | {
      status: (typeof CONTRACT_RECONCILER_HEALTH_STATUS)['degraded'];
      reasonCode: ReconcilerHealthReasonCode;
    };

export function resolveOverallHealthStatus(
  reconciler: ReconcilerHealthState
): (typeof OVERALL_HEALTH_STATUS)[keyof typeof OVERALL_HEALTH_STATUS] {
  return reconciler.status === RUNTIME_RECONCILER_HEALTH_STATUS.degraded
    ? OVERALL_HEALTH_STATUS.degraded
    : OVERALL_HEALTH_STATUS.healthy;
}

export function toPublicIntentReconcilerHealth(
  reconciler: ReconcilerHealthState
): PublicIntentReconcilerHealth {
  if (reconciler.status !== RUNTIME_RECONCILER_HEALTH_STATUS.degraded) {
    return { status: reconciler.status };
  }
  return {
    status: CONTRACT_RECONCILER_HEALTH_STATUS.degraded,
    reasonCode: reconciler.reasonCode ?? RECONCILER_HEALTH_REASON_CODE.runtimeUnavailable,
  };
}
