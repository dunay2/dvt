import { RECONCILER_HEALTH_STATUS, type ReconcilerHealthState } from '../runtime/reconcilerHealth.js';

import {
  READINESS_REASON_CODE,
  READINESS_STATUS,
  type ReadinessPayload,
} from './healthContract.js';
import type { HealthReadinessPorts } from './healthReadinessPorts.js';

export async function evaluateReadinessByPorts(
  reconciler: ReconcilerHealthState,
  ports: HealthReadinessPorts
): Promise<ReadinessPayload> {
  if (reconciler.status === RECONCILER_HEALTH_STATUS.degraded) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.reconcilerDegraded,
    };
  }

  if (reconciler.status === RECONCILER_HEALTH_STATUS.starting) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.reconcilerStarting,
    };
  }

  const databaseReady = await ports.checkDatabaseReady();
  if (!databaseReady) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.databaseUnavailable,
    };
  }

  const adaptersReady = await ports.checkRuntimeAdaptersReady();
  if (!adaptersReady) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.adapterUnavailable,
    };
  }

  return {
    ok: true,
    status: READINESS_STATUS.ready,
  };
}
