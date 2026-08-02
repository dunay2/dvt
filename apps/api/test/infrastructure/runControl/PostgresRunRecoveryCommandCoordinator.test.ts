import { describe, expect, it, vi } from 'vitest';

import { PostgresRunRecoveryCommandCoordinator } from '../../../src/infrastructure/runControl/PostgresRunRecoveryCommandCoordinator.js';

describe('PostgresRunRecoveryCommandCoordinator', () => {
  it('holds one session lock around the operation and always releases the client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) };
    const coordinator = new PostgresRunRecoveryCommandCoordinator(pool as never);
    const operation = vi.fn().mockResolvedValue('accepted');

    await expect(
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: 'run-recovery-1' },
        operation
      )
    ).resolves.toBe('accepted');

    expect(query).toHaveBeenNthCalledWith(1, 'SELECT pg_advisory_lock(hashtextextended($1, 0))', [
      'run-recovery:tenant-a:run-recovery-1',
    ]);
    expect(query).toHaveBeenNthCalledWith(2, 'SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
      'run-recovery:tenant-a:run-recovery-1',
    ]);
    expect(operation).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('unlocks and releases when the recovery operation fails', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const coordinator = new PostgresRunRecoveryCommandCoordinator({
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as never);

    await expect(
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: 'run-recovery-1' },
        async () => {
          throw new Error('dispatch failed');
        }
      )
    ).rejects.toThrow('dispatch failed');

    expect(query).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledOnce();
  });

  it('discards the session when advisory unlock fails', async () => {
    const unlockFailure = new Error('unlock interrupted');
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(unlockFailure);
    const release = vi.fn();
    const coordinator = new PostgresRunRecoveryCommandCoordinator({
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as never);

    await expect(
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: 'run-recovery-1' },
        async () => 'accepted'
      )
    ).rejects.toThrow('unlock interrupted');

    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(unlockFailure);
  });
});
