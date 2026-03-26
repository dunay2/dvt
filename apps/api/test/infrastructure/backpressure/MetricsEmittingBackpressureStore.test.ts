import { describe, expect, it, vi } from 'vitest';

import { MetricsEmittingBackpressureStore } from '../../../src/infrastructure/backpressure/MetricsEmittingBackpressureStore.js';

const SNAPSHOT = {
  pendingEventsPerTenant: 7,
  outboxOldestAgeMs: 12_000,
};

const LIVE_ENVELOPE = {
  snapshot: SNAPSHOT,
  capturedAtEpochMs: 1_000,
  source: 'live' as const,
};

const CACHE_ENVELOPE = {
  snapshot: SNAPSHOT,
  capturedAtEpochMs: 900,
  source: 'cache' as const,
};

describe('MetricsEmittingBackpressureStore', () => {
  it('returns snapshot from delegate', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue(LIVE_ENVELOPE),
    };
    const capacityTelemetry = { recordSnapshot: vi.fn() };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    const result = await store.getTenantSnapshot('tenant-1');

    expect(result).toEqual(SNAPSHOT);
  });

  it('calls capacityTelemetry.recordSnapshot with snapshot values', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue(LIVE_ENVELOPE),
    };
    const capacityTelemetry = { recordSnapshot: vi.fn() };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    await store.getTenantSnapshot('tenant-1');

    expect(capacityTelemetry.recordSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingEventsCount: SNAPSHOT.pendingEventsPerTenant,
        outboxOldestAgeMs: SNAPSHOT.outboxOldestAgeMs,
      })
    );
  });

  it('passes tenantId to recordSnapshot', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue(LIVE_ENVELOPE),
    };
    const capacityTelemetry = { recordSnapshot: vi.fn() };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    await store.getTenantSnapshot('my-tenant');

    expect(capacityTelemetry.recordSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'my-tenant' })
    );
  });

  it('passes source field from envelope', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue(CACHE_ENVELOPE),
    };
    const capacityTelemetry = { recordSnapshot: vi.fn() };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    await store.getTenantSnapshot('tenant-1');

    expect(capacityTelemetry.recordSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'cache' })
    );
  });

  it('still returns snapshot when capacityTelemetry.recordSnapshot throws', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockResolvedValue(LIVE_ENVELOPE),
    };
    const capacityTelemetry = {
      recordSnapshot: () => {
        throw new Error('gauge unavailable');
      },
    };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    await expect(store.getTenantSnapshot('tenant-1')).resolves.toEqual(SNAPSHOT);
  });

  it('propagates delegate errors', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockRejectedValue(new Error('db error')),
    };
    const capacityTelemetry = { recordSnapshot: vi.fn() };
    const store = new MetricsEmittingBackpressureStore({ delegate, capacityTelemetry });

    await expect(store.getTenantSnapshot('tenant-1')).rejects.toThrow('db error');
  });
});
