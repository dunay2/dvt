import {
  RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthState,
} from '../runtime/reconcilerHealth.js';

import {
  READINESS_REASON_CODE,
  READINESS_STATUS,
  type ReadinessPayload,
} from './healthContract.js';
import { READINESS_PROBE_STATUS, type HealthReadinessPorts } from './healthReadinessPorts.js';

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

  // Disabled reconciler is not an automatic ready state. Readiness still depends on
  // infrastructure ports (for example DB and runtime adapters) for deployment safety.
  const databaseProbeStatus = await ports.checkDatabaseReady();
  if (databaseProbeStatus === READINESS_PROBE_STATUS.notConfigured) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.databaseNotConfigured,
    };
  }

  if (databaseProbeStatus === READINESS_PROBE_STATUS.unavailable) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.databaseUnavailable,
    };
  }

  const runtimeAdaptersProbeStatus = await ports.checkRuntimeAdaptersReady();
  if (runtimeAdaptersProbeStatus === READINESS_PROBE_STATUS.notConfigured) {
    return {
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.adapterNotConfigured,
    };
  }

  if (runtimeAdaptersProbeStatus === READINESS_PROBE_STATUS.unavailable) {
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
