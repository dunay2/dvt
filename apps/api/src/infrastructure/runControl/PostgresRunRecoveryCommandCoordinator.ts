/** Owned concern: coordinate run recovery identities with PostgreSQL session locks. */
import type { Pool } from 'pg';

import type {
  IRunRecoveryCommandCoordinator,
  RunRecoveryCommandKey,
} from '../../application/ports/runRecoveryCommandCoordinator.js';

const LOCK_SQL = 'SELECT pg_advisory_lock(hashtextextended($1, 0))';
const UNLOCK_SQL = 'SELECT pg_advisory_unlock(hashtextextended($1, 0))';

export class PostgresRunRecoveryCommandCoordinator implements IRunRecoveryCommandCoordinator {
  private activeOperations = 0;
  private readonly capacityWaiters: Array<() => void> = [];

  public constructor(
    private readonly pool: Pick<Pool, 'connect'>,
    private readonly maxConcurrentOperations = 2
  ) {
    if (!Number.isInteger(maxConcurrentOperations) || maxConcurrentOperations < 1) {
      throw new Error('maxConcurrentOperations must be a positive integer');
    }
  }

  public async executeExclusive<T>(
    key: RunRecoveryCommandKey,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.acquireCapacity();
    try {
      return await this.executeWithSession(key, operation);
    } finally {
      this.releaseCapacity();
    }
  }

  private async executeWithSession<T>(
    key: RunRecoveryCommandKey,
    operation: () => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const lockKey = serializeRunRecoveryCommandKey(key);
    let releaseFailure: Error | undefined;

    try {
      await client.query(LOCK_SQL, [lockKey]);
      let outcome: OperationOutcome<T>;
      try {
        outcome = { kind: 'success', value: await operation() };
      } catch (error) {
        outcome = { kind: 'failure', error };
      }

      try {
        await client.query(UNLOCK_SQL, [lockKey]);
      } catch (error) {
        releaseFailure = toError(error);
        if (outcome.kind === 'failure') {
          throw new AggregateError(
            [outcome.error, releaseFailure],
            'The recovery operation and advisory unlock both failed.',
            { cause: error }
          );
        }
        throw releaseFailure;
      }

      if (outcome.kind === 'failure') throw outcome.error;
      return outcome.value;
    } finally {
      client.release(releaseFailure);
    }
  }

  private async acquireCapacity(): Promise<void> {
    if (this.activeOperations < this.maxConcurrentOperations) {
      this.activeOperations += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.capacityWaiters.push(resolve);
    });
  }

  private releaseCapacity(): void {
    const next = this.capacityWaiters.shift();
    if (next) {
      next();
      return;
    }
    this.activeOperations -= 1;
  }
}

function serializeRunRecoveryCommandKey(key: RunRecoveryCommandKey): string {
  return `run-recovery:${key.tenantId}:${key.recoveryRunId}`;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

type OperationOutcome<T> =
  Readonly<{ kind: 'success'; value: T }> | Readonly<{ kind: 'failure'; error: unknown }>;
