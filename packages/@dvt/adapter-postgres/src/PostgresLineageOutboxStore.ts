/**
 * @file packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
 *
 * PostgreSQL-backed lineage outbox and dead-letter storage.
 * Implements the ILineageOutboxStore contract: enqueue, deliver, retry,
 * and dead-letter operations for the DVT lineage publication pattern.
 *
 * G10 — outbox_lineage worker + fail-open DLQ
 */
import type {
  ILineageOutboxStore,
  LineageDeadLetterRecord,
  LineageOutboxRecord,
} from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';
import type { EventEnvelope } from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface LineageOutboxRow {
  id: string;
  run_id: string;
  event_type: string;
  payload: EventEnvelope;
  attempts: number;
  last_error: string | null;
  status: string;
  created_at: string;
}

interface LineageDeadLetterRow {
  id: string;
  original_id: string;
  run_id: string;
  event_type: string;
  payload: EventEnvelope;
  last_error: string;
  dead_lettered_at: string;
}

// ---------------------------------------------------------------------------
// PostgresLineageOutboxStore
// ---------------------------------------------------------------------------

export class PostgresLineageOutboxStore implements ILineageOutboxStore {
  constructor(
    private readonly schema: string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async enqueue(runId: string, payload: EventEnvelope): Promise<void> {
    const id = `lox-${payload.eventId}`;
    await this.withClient((client) =>
      client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.lineage_outbox
            (id, run_id, event_type, payload, attempts, status, created_at)
          VALUES ($1, $2, $3, $4::jsonb, 0, 'pending', NOW())
          ON CONFLICT (id) DO NOTHING
        `,
        [id, runId, payload.eventType, JSON.stringify(payload)]
      )
    );
  }

  async listPending(limit: number): Promise<LineageOutboxRecord[]> {
    const result = await this.withClient((client) =>
      client.query<LineageOutboxRow>(
        `
          SELECT id, run_id, event_type, payload, attempts, last_error, status, created_at
          FROM ${quoteIdentifier(this.schema)}.lineage_outbox
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT $1
        `,
        [limit]
      )
    );
    return result.rows.map(rowToRecord);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.withClient((client) =>
      client.query(
        `
          DELETE FROM ${quoteIdentifier(this.schema)}.lineage_outbox
          WHERE id = ANY($1::text[])
        `,
        [ids]
      )
    );
  }

  async markFailed(id: string, error: string, attempts: number): Promise<void> {
    await this.withClient((client) =>
      client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.lineage_outbox
          SET attempts = $2, last_error = $3
          WHERE id = $1
        `,
        [id, attempts, error]
      )
    );
  }

  async deadLetter(id: string, error: string): Promise<void> {
    await this.withClient(async (client) => {
      const result = await client.query<LineageOutboxRow>(
        `
          DELETE FROM ${quoteIdentifier(this.schema)}.lineage_outbox
          WHERE id = $1
          RETURNING id, run_id, event_type, payload
        `,
        [id]
      );
      const row = result.rows[0];
      if (!row) return;

      const dlId = `ldl-${row.id}-${Date.now()}`;
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.lineage_dead_letter
            (id, original_id, run_id, event_type, payload, last_error, dead_lettered_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
        `,
        [dlId, row.id, row.run_id, row.event_type, JSON.stringify(row.payload), error]
      );
    });
  }

  async listDeadLetter(limit: number): Promise<LineageDeadLetterRecord[]> {
    const result = await this.withClient((client) =>
      client.query<LineageDeadLetterRow>(
        `
          SELECT id, original_id, run_id, event_type, payload, last_error, dead_lettered_at
          FROM ${quoteIdentifier(this.schema)}.lineage_dead_letter
          ORDER BY dead_lettered_at DESC
          LIMIT $1
        `,
        [limit]
      )
    );
    return result.rows.map((row) => ({
      id: row.id,
      originalId: row.original_id,
      runId: row.run_id,
      eventType: row.event_type,
      payload: row.payload,
      lastError: row.last_error,
      deadLetteredAt: row.dead_lettered_at,
    }));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToRecord(row: LineageOutboxRow): LineageOutboxRecord {
  return {
    id: row.id,
    runId: row.run_id,
    eventType: row.event_type,
    payload: row.payload,
    attempts: row.attempts,
    ...(row.last_error !== null ? { lastError: row.last_error } : {}),
    createdAt: row.created_at,
  };
}
