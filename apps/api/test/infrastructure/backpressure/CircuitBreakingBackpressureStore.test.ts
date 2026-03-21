import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CircuitBreakingBackpressureStore } from '../../../src/infrastructure/backpressure/CircuitBreakingBackpressureStore.js';
import { FileBackpressureFallbackStore } from '../../../src/infrastructure/backpressure/FileBackpressureFallbackStore.js';

describe('CircuitBreakingBackpressureStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens after five consecutive live acquisition failures and uses fallback while open', async () => {
    let nowEpochMs = 10_000;
    const fallbackStore = {
      read: vi.fn().mockResolvedValue({
        snapshot: {
          pendingEventsPerTenant: 2,
          outboxOldestAgeMs: 1_000,
        },
        capturedAtEpochMs: 9_500,
        source: 'fallback' as const,
      }),
      write: vi.fn().mockResolvedValue(undefined),
    };
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockRejectedValue(new Error('db timeout')),
    };
    const store = new CircuitBreakingBackpressureStore({
      delegate,
      fallbackStore,
      failureThreshold: 5,
      openDurationMs: 30_000,
      snapshotMaxAgeMs: 5_000,
      nowEpochMs: () => nowEpochMs,
    });

    for (let i = 0; i < 5; i += 1) {
      await expect(store.getTenantSnapshot('tenant-a')).resolves.toEqual({
        pendingEventsPerTenant: 2,
        outboxOldestAgeMs: 1_000,
      });
    }

    expect(store.getCircuitState()).toBe('open');
    expect(delegate.getTenantSnapshotEnvelope).toHaveBeenCalledTimes(5);

    nowEpochMs += 1_000;
    await expect(store.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 2,
      outboxOldestAgeMs: 1_000,
    });
    expect(delegate.getTenantSnapshotEnvelope).toHaveBeenCalledTimes(5);
  });

  it('rejects stale fallback snapshots', async () => {
    const fallbackStore = {
      read: vi.fn().mockResolvedValue({
        snapshot: {
          pendingEventsPerTenant: 2,
          outboxOldestAgeMs: 1_000,
        },
        capturedAtEpochMs: 1_000,
        source: 'fallback' as const,
      }),
      write: vi.fn().mockResolvedValue(undefined),
    };
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi.fn().mockRejectedValue(new Error('db timeout')),
    };
    const store = new CircuitBreakingBackpressureStore({
      delegate,
      fallbackStore,
      failureThreshold: 5,
      openDurationMs: 30_000,
      snapshotMaxAgeMs: 500,
      nowEpochMs: () => 2_000,
    });

    await expect(store.getTenantSnapshot('tenant-a')).rejects.toThrow(
      'Backpressure snapshot unavailable'
    );
  });

  it('closes the circuit after a successful half-open probe', async () => {
    let nowEpochMs = 10_000;
    const fallbackStore = {
      read: vi.fn().mockResolvedValue({
        snapshot: {
          pendingEventsPerTenant: 1,
          outboxOldestAgeMs: 800,
        },
        capturedAtEpochMs: 9_500,
        source: 'fallback' as const,
      }),
      write: vi.fn().mockResolvedValue(undefined),
    };
    const delegate = {
      getTenantSnapshot: vi.fn(),
      getTenantSnapshotEnvelope: vi
        .fn()
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockRejectedValueOnce(new Error('db timeout'))
        .mockResolvedValue({
          snapshot: {
            pendingEventsPerTenant: 0,
            outboxOldestAgeMs: 50,
          },
          capturedAtEpochMs: 40_001,
          source: 'live' as const,
        }),
    };
    const store = new CircuitBreakingBackpressureStore({
      delegate,
      fallbackStore,
      failureThreshold: 5,
      openDurationMs: 30_000,
      snapshotMaxAgeMs: 5_000,
      nowEpochMs: () => nowEpochMs,
    });

    for (let i = 0; i < 5; i += 1) {
      await store.getTenantSnapshot('tenant-a');
    }
    expect(store.getCircuitState()).toBe('open');

    nowEpochMs = 40_001;
    await expect(store.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 0,
      outboxOldestAgeMs: 50,
    });
    expect(store.getCircuitState()).toBe('closed');
  });

  it('reuses persisted fallback after hot restart while it is still fresh', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-'));
    const filePath = join(directory, 'fallback.json');
    const fileStore = new FileBackpressureFallbackStore(filePath);
    const liveStore = new CircuitBreakingBackpressureStore({
      delegate: {
        getTenantSnapshot: vi.fn(),
        getTenantSnapshotEnvelope: vi.fn().mockResolvedValue({
          snapshot: {
            pendingEventsPerTenant: 4,
            outboxOldestAgeMs: 1_200,
          },
          capturedAtEpochMs: 5_000,
          source: 'live' as const,
        }),
      },
      fallbackStore: fileStore,
      failureThreshold: 5,
      openDurationMs: 30_000,
      snapshotMaxAgeMs: 2_000,
      nowEpochMs: () => 5_000,
    });

    await expect(liveStore.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 4,
      outboxOldestAgeMs: 1_200,
    });

    const restartedStore = new CircuitBreakingBackpressureStore({
      delegate: {
        getTenantSnapshot: vi.fn(),
        getTenantSnapshotEnvelope: vi.fn().mockRejectedValue(new Error('db down')),
      },
      fallbackStore: fileStore,
      failureThreshold: 5,
      openDurationMs: 30_000,
      snapshotMaxAgeMs: 2_000,
      nowEpochMs: () => 6_000,
    });

    await expect(restartedStore.getTenantSnapshot('tenant-a')).resolves.toEqual({
      pendingEventsPerTenant: 4,
      outboxOldestAgeMs: 1_200,
    });
  });
});
