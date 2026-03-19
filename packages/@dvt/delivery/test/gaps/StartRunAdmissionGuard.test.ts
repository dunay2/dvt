import { describe, expect, it, vi } from 'vitest';

import { StartRunAdmissionGuard } from '../../src/backpressure/StartRunAdmissionGuard.js';

describe('StartRunAdmissionGuard', () => {
  it('allows startRun when tenant backlog and system lag are healthy', async () => {
    const backpressureStore = {
      getTenantSnapshot: vi.fn().mockResolvedValue({
        pendingEventsPerTenant: 10,
        outboxOldestAgeMs: 500,
      }),
    };

    const guard = new StartRunAdmissionGuard({
      backpressureStore,
      policy: {
        maxPendingEventsPerTenant: 100,
        maxOutboxLagMs: 30_000,
      },
    });

    await expect(guard.assertAdmissible('tenant-a')).resolves.toBeUndefined();
  });

  it('rejects with TenantBackpressureError when tenant backlog exceeds threshold', async () => {
    const backpressureStore = {
      getTenantSnapshot: vi.fn().mockResolvedValue({
        pendingEventsPerTenant: 101,
        outboxOldestAgeMs: 500,
      }),
    };

    const guard = new StartRunAdmissionGuard({
      backpressureStore,
      policy: {
        maxPendingEventsPerTenant: 100,
        maxOutboxLagMs: 30_000,
      },
    });

    await expect(guard.assertAdmissible('tenant-a')).rejects.toMatchObject({
      code: 'TENANT_BACKPRESSURE',
      tenantId: 'tenant-a',
    });
  });

  it('rejects with SystemBackpressureError when outbox lag exceeds threshold', async () => {
    const backpressureStore = {
      getTenantSnapshot: vi.fn().mockResolvedValue({
        pendingEventsPerTenant: 10,
        outboxOldestAgeMs: 120_001,
      }),
    };

    const guard = new StartRunAdmissionGuard({
      backpressureStore,
      policy: {
        maxPendingEventsPerTenant: 100,
        maxOutboxLagMs: 120_000,
      },
    });

    await expect(guard.assertAdmissible('tenant-a')).rejects.toMatchObject({
      code: 'SYSTEM_BACKPRESSURE',
    });
  });

  it('fails closed when the store cannot produce a snapshot', async () => {
    const backpressureStore = {
      getTenantSnapshot: vi.fn().mockRejectedValue(new Error('store down')),
    };

    const guard = new StartRunAdmissionGuard({
      backpressureStore,
      policy: {
        maxPendingEventsPerTenant: 100,
        maxOutboxLagMs: 120_000,
      },
    });

    await expect(guard.assertAdmissible('tenant-a')).rejects.toMatchObject({
      code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
    });
  });
});
