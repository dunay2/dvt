import { describe, expect, it } from 'vitest';

import {
  resolveTenantHotRetentionDays,
  validateRunEventRetentionPolicy,
  type RunEventRetentionPolicy,
} from '../src/index.js';

const BASE_POLICY: RunEventRetentionPolicy = {
  hotRetentionDays: 90,
  archiveBucketCount: 64,
  pinTerminalSnapshots: true,
};

describe('RunEventRetentionPolicy', () => {
  it('resolves tenant overrides before the default hot-retention window', () => {
    const policy: RunEventRetentionPolicy = {
      ...BASE_POLICY,
      tenantHotRetentionDays: [
        { tenantId: 'free-tier', hotRetentionDays: 7 },
        { tenantId: 'enterprise', hotRetentionDays: 365 },
      ],
    };

    expect(resolveTenantHotRetentionDays(policy, 'free-tier')).toBe(7);
    expect(resolveTenantHotRetentionDays(policy, 'enterprise')).toBe(365);
    expect(resolveTenantHotRetentionDays(policy, 'unconfigured')).toBe(90);
  });

  it('rejects invalid tenant override entries', () => {
    expect(() =>
      validateRunEventRetentionPolicy({
        ...BASE_POLICY,
        tenantHotRetentionDays: [{ tenantId: '   ', hotRetentionDays: 30 }],
      })
    ).toThrow(/RUN_EVENT_RETENTION_TENANT_ID_INVALID/);

    expect(() =>
      validateRunEventRetentionPolicy({
        ...BASE_POLICY,
        tenantHotRetentionDays: [{ tenantId: 'tenant-1', hotRetentionDays: 0 }],
      })
    ).toThrow(/RUN_EVENT_RETENTION_TENANT_HOT_RETENTION_DAYS_INVALID/);
  });
});
