import { describe, expect, it } from 'vitest';

import { READINESS_REASON_CODE, READINESS_STATUS } from '../../src/routes/healthContract.js';
import { evaluateReadinessByPorts } from '../../src/routes/healthReadinessPolicy.js';
import { READINESS_PROBE_STATUS } from '../../src/routes/healthReadinessPorts.js';
import { RECONCILER_HEALTH_STATUS } from '../../src/runtime/reconcilerHealth.js';

describe('health readiness policy', () => {
  it('returns database_unavailable when db probe is unavailable', async () => {
    const readiness = await evaluateReadinessByPorts(
      { status: RECONCILER_HEALTH_STATUS.healthy },
      {
        checkDatabaseReady: async () => READINESS_PROBE_STATUS.unavailable,
        checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.ready,
      }
    );

    expect(readiness).toEqual({
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.databaseUnavailable,
    });
  });

  it('returns adapter_unavailable when adapter probe is unavailable', async () => {
    const readiness = await evaluateReadinessByPorts(
      { status: RECONCILER_HEALTH_STATUS.healthy },
      {
        checkDatabaseReady: async () => READINESS_PROBE_STATUS.ready,
        checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.unavailable,
      }
    );

    expect(readiness).toEqual({
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.adapterUnavailable,
    });
  });

  it('returns adapter_not_configured when adapter probe is not configured', async () => {
    const readiness = await evaluateReadinessByPorts(
      { status: RECONCILER_HEALTH_STATUS.healthy },
      {
        checkDatabaseReady: async () => READINESS_PROBE_STATUS.ready,
        checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.notConfigured,
      }
    );

    expect(readiness).toEqual({
      ok: false,
      status: READINESS_STATUS.notReady,
      reasonCode: READINESS_REASON_CODE.adapterNotConfigured,
    });
  });
});
