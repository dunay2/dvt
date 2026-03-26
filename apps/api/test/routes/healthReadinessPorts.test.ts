import { describe, expect, it, vi } from 'vitest';

import {
  createHealthReadinessPorts,
  READINESS_PROBE_STATUS,
} from '../../src/routes/healthReadinessPorts.js';

describe('health readiness ports', () => {
  it('returns not_configured when databaseUrl is missing', async () => {
    const ports = createHealthReadinessPorts({
      databaseUrl: undefined,
      checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.notConfigured,
    });

    await expect(ports.checkDatabaseReady()).resolves.toBe(READINESS_PROBE_STATUS.notConfigured);
  });

  it('emits probe failure callback and returns unavailable when probe throws', async () => {
    const onDatabaseProbeFailure = vi.fn();
    const ports = createHealthReadinessPorts({
      databaseUrl: 'postgres://user:pass@localhost:5432/dvt',
      checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.ready,
      probeDatabaseReadiness: async () => {
        throw new Error('probe failed');
      },
      onDatabaseProbeFailure,
    });

    await expect(ports.checkDatabaseReady()).resolves.toBe(READINESS_PROBE_STATUS.unavailable);
    expect(onDatabaseProbeFailure).toHaveBeenCalledOnce();
  });

  it('returns runtime adapters probe status without boolean coercion', async () => {
    const ports = createHealthReadinessPorts({
      databaseUrl: undefined,
      checkRuntimeAdaptersReady: async () => READINESS_PROBE_STATUS.notConfigured,
    });

    await expect(ports.checkRuntimeAdaptersReady()).resolves.toBe(
      READINESS_PROBE_STATUS.notConfigured
    );
  });
});
