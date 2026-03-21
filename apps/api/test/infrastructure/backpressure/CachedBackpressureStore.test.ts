import { describe, expect, it, vi } from 'vitest';

import { CachedBackpressureStore } from '../../../src/infrastructure/backpressure/CachedBackpressureStore.js';

describe('CachedBackpressureStore', () => {
  it('returns cached live snapshots within the TTL', async () => {
    let nowEpochMs = 1_000;
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockImplementation(async () => ({
        snapshot: {
          pendingEventsPerTenant: 3,
          outboxOldestAgeMs: 90_000,
        },
        capturedAtEpochMs: nowEpochMs,
        source: 'live' as const,
      })),
    };
    const store = new CachedBackpressureStore({
      delegate,
      ttlMs: 2_000,
      nowEpochMs: () => nowEpochMs,
    });

    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toMatchObject({
      source: 'live',
      capturedAtEpochMs: 1_000,
    });

    nowEpochMs = 2_500;
    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toMatchObject({
      source: 'cache',
      capturedAtEpochMs: 1_000,
    });

    nowEpochMs = 3_100;
    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toMatchObject({
      source: 'live',
      capturedAtEpochMs: 3_100,
    });
    expect(delegate.getTenantSnapshotEnvelope).toHaveBeenCalledTimes(2);
  });

  it('does not cache fallback snapshots', async () => {
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi
        .fn()
        .mockResolvedValue({
          snapshot: {
            pendingEventsPerTenant: 1,
            outboxOldestAgeMs: 10_000,
          },
          capturedAtEpochMs: 500,
          source: 'fallback' as const,
        }),
    };
    const store = new CachedBackpressureStore({
      delegate,
      ttlMs: 2_000,
      nowEpochMs: () => 1_000,
    });

    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toMatchObject({
      source: 'fallback',
    });
    await expect(store.getTenantSnapshotEnvelope('tenant-a')).resolves.toMatchObject({
      source: 'fallback',
    });
    expect(delegate.getTenantSnapshotEnvelope).toHaveBeenCalledTimes(2);
  });
});
