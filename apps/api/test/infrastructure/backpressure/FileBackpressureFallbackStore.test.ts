import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FileBackpressureFallbackStore } from '../../../src/infrastructure/backpressure/FileBackpressureFallbackStore.js';

describe('FileBackpressureFallbackStore', () => {
  it('round-trips fallback envelopes per tenant and preserves other tenants', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-fallback-'));
    const filePath = join(directory, 'fallback.json');
    const store = new FileBackpressureFallbackStore(filePath);

    await store.write('tenant-a', {
      snapshot: {
        pendingEventsPerTenant: 3,
        outboxOldestAgeMs: 45_000,
      },
      capturedAtEpochMs: 1_000,
      source: 'live',
    });

    await store.write('tenant-b', {
      snapshot: {
        pendingEventsPerTenant: 1,
        outboxOldestAgeMs: 9_000,
      },
      capturedAtEpochMs: 2_000,
      source: 'cache',
    });

    await expect(store.read('tenant-a')).resolves.toEqual({
      snapshot: {
        pendingEventsPerTenant: 3,
        outboxOldestAgeMs: 45_000,
      },
      capturedAtEpochMs: 1_000,
      source: 'fallback',
    });

    await expect(store.read('tenant-b')).resolves.toEqual({
      snapshot: {
        pendingEventsPerTenant: 1,
        outboxOldestAgeMs: 9_000,
      },
      capturedAtEpochMs: 2_000,
      source: 'fallback',
    });

    await expect(store.read('tenant-missing')).resolves.toBeNull();
  });

  it('writes atomically without leaving temporary files behind', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-fallback-atomic-'));
    const filePath = join(directory, 'fallback.json');
    const store = new FileBackpressureFallbackStore(filePath);

    await store.write('tenant-a', {
      snapshot: {
        pendingEventsPerTenant: 7,
        outboxOldestAgeMs: 12_000,
      },
      capturedAtEpochMs: 3_000,
      source: 'live',
    });

    const entries = await readdir(directory);
    expect(entries).toEqual(['fallback.json']);

    await expect(readFile(filePath, 'utf8')).resolves.toContain('"tenant-a"');
  });

  it('returns null when the fallback file is missing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-fallback-missing-'));
    const store = new FileBackpressureFallbackStore(join(directory, 'fallback.json'));

    await expect(store.read('tenant-a')).resolves.toBeNull();
  });

  it('ignores malformed tenant entries while preserving valid ones', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-fallback-corrupt-'));
    const filePath = join(directory, 'fallback.json');
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        tenants: {
          'tenant-valid': {
            snapshot: {
              pendingEventsPerTenant: 2,
              outboxOldestAgeMs: 11_000,
            },
            capturedAtEpochMs: 1_500,
          },
          'tenant-bad': {
            snapshot: {
              pendingEventsPerTenant: 'not-a-number',
              outboxOldestAgeMs: 11_000,
            },
            capturedAtEpochMs: 'bad',
          },
        },
      }),
      'utf8'
    );

    const store = new FileBackpressureFallbackStore(filePath);

    await expect(store.read('tenant-valid')).resolves.toEqual({
      snapshot: {
        pendingEventsPerTenant: 2,
        outboxOldestAgeMs: 11_000,
      },
      capturedAtEpochMs: 1_500,
      source: 'fallback',
    });
    await expect(store.read('tenant-bad')).resolves.toBeNull();
  });

  it('returns null when the persisted version is unsupported', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dvt-backpressure-fallback-version-'));
    const filePath = join(directory, 'fallback.json');
    await writeFile(
      filePath,
      JSON.stringify({
        version: 2,
        tenants: {
          'tenant-a': {
            snapshot: {
              pendingEventsPerTenant: 4,
              outboxOldestAgeMs: 10_000,
            },
            capturedAtEpochMs: 5_000,
          },
        },
      }),
      'utf8'
    );

    const store = new FileBackpressureFallbackStore(filePath);

    await expect(store.read('tenant-a')).resolves.toBeNull();
  });
});
