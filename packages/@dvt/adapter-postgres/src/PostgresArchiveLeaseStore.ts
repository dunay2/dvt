import { randomUUID } from 'node:crypto';

import type { ArchiveLease, IArchiveLeaseStore } from '@dvt/state-store';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

interface LeaseRow {
  worker_id: string;
  lease_token: string;
  acquired_at: Date | string;
  renewed_at: Date | string;
  expires_at: Date | string;
}

export class PostgresArchiveLeaseStore implements IArchiveLeaseStore {
  constructor(
    private readonly schema: string,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async tryAcquire(
    workerId: string,
    ttlSeconds: number,
    nowIso: string
  ): Promise<ArchiveLease | null> {
    validateWorkerId(workerId);
    validateTtl(ttlSeconds);

    return this.withTransaction(async (client) => {
      const expiresAt = addSeconds(nowIso, ttlSeconds);
      const leaseToken = randomUUID();

      // Attempt to insert a new row or replace an expired one.
      // We use a raw UPSERT guarded by expires_at < NOW() to ensure only one
      // worker wins when two race simultaneously.
      const result = await client.query<LeaseRow>(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_event_archive_leases
            (worker_id, lease_token, acquired_at, renewed_at, expires_at)
          VALUES ($1, $2, $3::timestamptz, $3::timestamptz, $4::timestamptz)
          ON CONFLICT (worker_id) DO UPDATE
            SET
              lease_token = EXCLUDED.lease_token,
              acquired_at = EXCLUDED.acquired_at,
              renewed_at  = EXCLUDED.renewed_at,
              expires_at  = EXCLUDED.expires_at
            WHERE run_event_archive_leases.expires_at < $3::timestamptz
          RETURNING *
        `,
        [workerId, leaseToken, nowIso, expiresAt]
      );

      const row = result.rows[0];
      if (!row) {
        return null; // another worker holds a live lease
      }

      return rowToLease(row);
    });
  }

  async renew(lease: ArchiveLease, ttlSeconds: number, nowIso: string): Promise<boolean> {
    validateTtl(ttlSeconds);
    const expiresAt = addSeconds(nowIso, ttlSeconds);

    return this.withTransaction(async (client) => {
      const result = await client.query<LeaseRow>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_event_archive_leases
          SET
            renewed_at = $3::timestamptz,
            expires_at = $4::timestamptz
          WHERE worker_id = $1 AND lease_token = $2
          RETURNING *
        `,
        [lease.workerId, lease.leaseToken, nowIso, expiresAt]
      );

      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async release(lease: ArchiveLease): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(
        `
          DELETE FROM ${quoteIdentifier(this.schema)}.run_event_archive_leases
          WHERE worker_id = $1 AND lease_token = $2
        `,
        [lease.workerId, lease.leaseToken]
      );
    });
  }

  async assertLeaseHeld(lease: ArchiveLease, nowIso: string): Promise<void> {
    await this.withClient(async (client) => {
      const result = await client.query<{ lease_token: string }>(
        `
          SELECT lease_token
          FROM ${quoteIdentifier(this.schema)}.run_event_archive_leases
          WHERE worker_id = $1
            AND lease_token = $2
            AND expires_at > $3::timestamptz
          LIMIT 1
        `,
        [lease.workerId, lease.leaseToken, nowIso]
      );

      if (!result.rows[0]) {
        throw new Error('ARCHIVE_LEASE_LOST');
      }
    });
  }
}

function rowToLease(row: LeaseRow): ArchiveLease {
  return {
    workerId: row.worker_id,
    leaseToken: row.lease_token,
    acquiredAt: new Date(row.acquired_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

function addSeconds(isoString: string, seconds: number): string {
  return new Date(new Date(isoString).getTime() + seconds * 1000).toISOString();
}

function validateWorkerId(workerId: string): void {
  if (!workerId.trim()) {
    throw new Error('ARCHIVE_WORKER_ID_REQUIRED');
  }
}

function validateTtl(ttlSeconds: number): void {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('ARCHIVE_LEASE_TIMEOUT_INVALID');
  }
}
