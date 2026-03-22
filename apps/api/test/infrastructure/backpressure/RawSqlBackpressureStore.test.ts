import { describe, expect, it, vi } from 'vitest';

import { RawSqlBackpressureStore } from '../../../src/infrastructure/backpressure/RawSqlBackpressureStore.js';

describe('RawSqlBackpressureStore', () => {
  it('maps the richer SQL snapshot into the delivery backpressure contract', async () => {
    const reader = {
      getTenantSnapshot: vi.fn().mockResolvedValue({
        tenantActivePendingEventCount: 4,
        tenantStuckPendingEventCount: 2,
        globalActivePendingEventCount: 11,
        globalHealthyTenantOldestActiveAgeMs: 90_000,
      }),
    };
    const store = new RawSqlBackpressureStore(reader);

    await expect(store.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 4,
      outboxOldestAgeMs: 90_000,
    });
    expect(reader.getTenantSnapshot).toHaveBeenCalledWith('tenant-a');
  });

  it('exposes acquisition metadata for resilience wrappers', async () => {
    const reader = {
      getTenantSnapshot: vi.fn().mockResolvedValue({
        tenantActivePendingEventCount: 1,
        tenantStuckPendingEventCount: 0,
        globalActivePendingEventCount: 2,
        globalHealthyTenantOldestActiveAgeMs: 12_000,
      }),
    };
    const store = new RawSqlBackpressureStore(reader, () => 1234);

    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toEqual({
      snapshot: {
        pendingEventsPerTenant: 1,
        outboxOldestAgeMs: 12_000,
      },
      capturedAtEpochMs: 1234,
      source: 'live',
    });
  });
});
