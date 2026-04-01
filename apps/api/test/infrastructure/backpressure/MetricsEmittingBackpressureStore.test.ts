import { describe, expect, it, vi } from 'vitest';

import { MetricsEmittingBackpressureStore } from '../../../src/infrastructure/backpressure/MetricsEmittingBackpressureStore.js';

describe('MetricsEmittingBackpressureStore', () => {
  it('returns snapshot from delegate and emits telemetry', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue({
        snapshot: {
          pendingEventsPerTenant: 5,
          outboxOldestAgeMs: 10_000,
        },
        capturedAtEpochMs: 1_000,
        source: 'live' as const,
      }),
    };
    const capacityTelemetry = {
      recordSnapshot: vi.fn(),
    };
    const store = new MetricsEmittingBackpressureStore({
      delegate,
      capacityTelemetry,
    });

    await expect(store.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 5,
      outboxOldestAgeMs: 10_000,
    });
    expect(capacityTelemetry.recordSnapshot).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      pendingEventsCount: 5,
      outboxOldestAgeMs: 10_000,
      source: 'live',
    });
  });

  it('swallows telemetry errors and still returns snapshot', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue({
        snapshot: {
          pendingEventsPerTenant: 9,
          outboxOldestAgeMs: 20_000,
        },
        capturedAtEpochMs: 2_000,
        source: 'fallback' as const,
      }),
    };
    const capacityTelemetry = {
      recordSnapshot: vi.fn().mockImplementation(() => {
        throw new Error('metrics down');
      }),
    };
    const store = new MetricsEmittingBackpressureStore({
      delegate,
      capacityTelemetry,
    });

    await expect(store.getTenantSnapshot('tenant-b')).resolves.toEqual({
      pendingEventsPerTenant: 9,
      outboxOldestAgeMs: 20_000,
    });
  });

  it('propagates delegate errors', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockRejectedValue(new Error('snapshot unavailable')),
    };
    const capacityTelemetry = {
      recordSnapshot: vi.fn(),
    };
    const store = new MetricsEmittingBackpressureStore({
      delegate,
      capacityTelemetry,
    });

    await expect(store.getTenantSnapshot('tenant-c')).rejects.toThrow('snapshot unavailable');
    expect(capacityTelemetry.recordSnapshot).not.toHaveBeenCalled();
  });
});
