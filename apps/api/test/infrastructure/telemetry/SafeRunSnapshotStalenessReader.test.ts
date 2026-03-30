import { describe, expect, it, vi } from 'vitest';

import { SafeRunSnapshotStalenessReader } from '../../../src/infrastructure/telemetry/SafeRunSnapshotStalenessReader.js';

describe('SafeRunSnapshotStalenessReader', () => {
  it('returns boolean when query succeeds', async () => {
    const query = {
      isSnapshotStale: vi.fn().mockResolvedValue(true),
    };
    const observability = {
      logs: { warn: vi.fn() },
    };

    const reader = new SafeRunSnapshotStalenessReader(query as never, observability as never);

    await expect(reader.isSnapshotStale('tenant-a', 'run-1')).resolves.toBe(true);
    expect(observability.logs.warn).not.toHaveBeenCalled();
  });

  it('returns null and logs safely when query fails', async () => {
    const query = {
      isSnapshotStale: vi.fn().mockRejectedValue(new Error('db down')),
    };
    const observability = {
      logs: { warn: vi.fn() },
    };

    const reader = new SafeRunSnapshotStalenessReader(query as never, observability as never);

    await expect(reader.isSnapshotStale('tenant-a', 'run-1')).resolves.toBeNull();
    expect(observability.logs.warn).toHaveBeenCalled();
  });
});
