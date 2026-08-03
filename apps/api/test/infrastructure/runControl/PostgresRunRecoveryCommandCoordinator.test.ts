import { describe, expect, it, vi } from 'vitest';

import { PostgresRunRecoveryCommandCoordinator } from '../../../src/infrastructure/runControl/PostgresRunRecoveryCommandCoordinator.js';

describe('PostgresRunRecoveryCommandCoordinator', () => {
  it('queues a third independent recovery before checking out another database client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query, release });
    const coordinator = new PostgresRunRecoveryCommandCoordinator({ connect } as never, 2);
    const gates = [deferred(), deferred()];
    let activeOperations = 0;
    let maximumActiveOperations = 0;
    let startedOperations = 0;

    const executions = [0, 1, 2].map((index) =>
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: `run-recovery-${index}` },
        async () => {
          startedOperations += 1;
          activeOperations += 1;
          maximumActiveOperations = Math.max(maximumActiveOperations, activeOperations);
          if (index < 2) {
            await gates[index]!.promise;
          }
          activeOperations -= 1;
          return index;
        }
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    const startedBeforeCapacityRelease = startedOperations;
    gates.forEach((gate) => gate.resolve());

    await expect(Promise.all(executions)).resolves.toEqual([0, 1, 2]);
    expect(startedBeforeCapacityRelease).toBe(2);
    expect(maximumActiveOperations).toBeLessThanOrEqual(2);
    expect(connect).toHaveBeenCalledTimes(3);
  });

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

  it('releases capacity when database checkout fails', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce({ query, release });
    const coordinator = new PostgresRunRecoveryCommandCoordinator({ connect } as never, 1);

    await expect(
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: 'run-recovery-failed-checkout' },
        async () => 'not-reached'
      )
    ).rejects.toThrow('database unavailable');
    await expect(
      coordinator.executeExclusive(
        { tenantId: 'tenant-a', recoveryRunId: 'run-recovery-after-checkout' },
        async () => 'accepted'
      )
    ).resolves.toBe('accepted');

    expect(connect).toHaveBeenCalledTimes(2);
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

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
