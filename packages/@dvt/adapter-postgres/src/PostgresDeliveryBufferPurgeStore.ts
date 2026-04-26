/**
 * @file packages/@dvt/adapter-postgres/src/PostgresDeliveryBufferPurgeStore.ts
 *
 * PostgreSQL implementation of IDeliveryBufferPurgeStore (G5-PR3).
 *
 * Provides range-based DELETE operations (via CTE to work around the lack of
 * a native DELETE ... LIMIT in PostgreSQL) for the three non-authoritative
 * delivery buffers:
 *
 *   outbox              — rows where delivered_at IS NOT NULL
 *   outbox_dead_letter  — all rows (no state column; age is the only criterion)
 *   lineage_dead_letter — all rows
 *
 * Each method returns the number of rows deleted.
 * COUNT queries are provided for pre-purge retained_rows metrics.
 */

import type { IDeliveryBufferPurgeStore } from '@dvt/state-store';
import type { PoolClient } from 'pg';

import { enterPostgresMaintenanceContext } from './PostgresMaintenanceAccess.js';
import { POSTGRES_SERVICE_ACCESS } from './PostgresServiceAccessCapability.js';
import { quoteIdentifier } from './sqlUtils.js';

const DELIVERY_BUFFER_PURGE_SERVICE_ACCESS = POSTGRES_SERVICE_ACCESS.deliveryBufferPurge;

export class PostgresDeliveryBufferPurgeStore implements IDeliveryBufferPurgeStore {
  constructor(
    private readonly schema: string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  // ---------------------------------------------------------------------------
  // Purge methods
  // ---------------------------------------------------------------------------

  async purgeDeliveredOutbox(olderThanIso: string, limit: number): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query(
        `
          WITH to_delete AS (
            SELECT id
            FROM ${quoteIdentifier(this.schema)}.outbox
            WHERE delivered_at IS NOT NULL
              AND delivered_at < $1::timestamptz
            LIMIT $2
          )
          DELETE FROM ${quoteIdentifier(this.schema)}.outbox
          WHERE id IN (SELECT id FROM to_delete)
        `,
        [olderThanIso, limit]
      );
    });
    return result.rowCount ?? 0;
  }

  async purgeOutboxDeadLetter(olderThanIso: string, limit: number): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query(
        `
          WITH to_delete AS (
            SELECT id
            FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter
            WHERE dead_lettered_at < $1::timestamptz
            LIMIT $2
          )
          DELETE FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter
          WHERE id IN (SELECT id FROM to_delete)
        `,
        [olderThanIso, limit]
      );
    });
    return result.rowCount ?? 0;
  }

  async purgeLineageDeadLetter(olderThanIso: string, limit: number): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query(
        `
          WITH to_delete AS (
            SELECT id
            FROM ${quoteIdentifier(this.schema)}.lineage_dead_letter
            WHERE dead_lettered_at < $1::timestamptz
            LIMIT $2
          )
          DELETE FROM ${quoteIdentifier(this.schema)}.lineage_dead_letter
          WHERE id IN (SELECT id FROM to_delete)
        `,
        [olderThanIso, limit]
      );
    });
    return result.rowCount ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Count methods (for retained_rows metrics)
  // ---------------------------------------------------------------------------

  async countDeliveredOutbox(): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(this.schema)}.outbox WHERE delivered_at IS NOT NULL`
      );
    });
    return Number(result.rows[0]?.count ?? 0);
  }

  async countOutboxDeadLetter(): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter`
      );
    });
    return Number(result.rows[0]?.count ?? 0);
  }

  async countLineageDeadLetter(): Promise<number> {
    const result = await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, DELIVERY_BUFFER_PURGE_SERVICE_ACCESS);
      return client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(this.schema)}.lineage_dead_letter`
      );
    });
    return Number(result.rows[0]?.count ?? 0);
  }
}
