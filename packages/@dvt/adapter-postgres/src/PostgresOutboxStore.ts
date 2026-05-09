/**
 * @file packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
 *
 * PostgreSQL-backed outbox and dead-letter storage.
 * Owned concern: persist, claim, retry, and replay tenant-scoped outbox records
 * while applying the Delivery-owned tenant-affine shard assignment policy at
 * enqueue time.
 *
 * Implements the IOutboxStorage contract: claim, deliver, retry, dead-letter,
 * and replay operations for the DVT transactional outbox pattern.
 *
 * Receives transaction management callbacks from the parent adapter so that
 * outbox enqueue can participate in the adapter's existing transactions
 * (bootstrapRunTx, appendAndEnqueueTx) while sharing the same connection
 * lifecycle and abort-tracking logic.
 */
import type { PoolClient } from 'pg';

import { enterPostgresMaintenanceContext } from './PostgresMaintenanceAccess.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { POSTGRES_SERVICE_ACCESS } from './PostgresServiceAccessCapability.js';
import { quoteIdentifier } from './sqlUtils.js';
import type {
  DeadLetterRecord,
  EventEnvelope,
  IOutboxStorage,
  OutboxRecord,
  RunId,
} from './types.js';
import { MAX_OUTBOX_ATTEMPTS } from './types.js';

const DEFAULT_OUTBOX_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const OUTBOX_SERVICE_ACCESS = POSTGRES_SERVICE_ACCESS.outboxWorker;

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface OutboxRow {
  id: string;
  created_at: string;
  idempotency_key: string;
  payload: EventEnvelope;
  attempts: number;
  last_error: string | null;
  next_attempt_at?: string | null;
}

interface DeadLetterRow {
  id: string;
  original_id: string;
  run_id: string;
  payload: EventEnvelope;
  last_error: string;
  dead_lettered_at: string;
}

interface MarkFailedRow {
  attempts: number;
  payload: EventEnvelope;
  tenant_id: string;
  run_id: string;
  shard_id: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function normalizeOutboxShardCount(value: number | undefined): number {
  const shardCount = value ?? 1;
  if (!Number.isInteger(shardCount) || shardCount <= 0) {
    throw new Error(`INVALID_OUTBOX_SHARD_COUNT: ${value}`);
  }
  return shardCount;
}

export function normalizeOutboxClaimTimeoutMs(value: number | undefined): number {
  const claimTimeoutMs = value ?? DEFAULT_OUTBOX_CLAIM_TIMEOUT_MS;
  if (!Number.isInteger(claimTimeoutMs) || claimTimeoutMs <= 0) {
    throw new Error(`INVALID_OUTBOX_CLAIM_TIMEOUT_MS: ${value}`);
  }
  return claimTimeoutMs;
}

export function normalizeShardSelection(shardIds: readonly number[] | undefined): number[] | null {
  if (shardIds === undefined) {
    return null;
  }
  const normalized = shardIds.map(Number);
  if (normalized.some((shardId) => !Number.isInteger(shardId) || shardId < 0)) {
    throw new Error('INVALID_OUTBOX_SHARD_SELECTION');
  }
  return [...new Set(normalized)].sort((left, right) => left - right);
}

// ---------------------------------------------------------------------------
// PostgresOutboxStore
// ---------------------------------------------------------------------------

export class PostgresOutboxStore implements IOutboxStorage {
  constructor(
    private readonly schema: string,
    private readonly now: () => string,
    private readonly outboxShardCount: number,
    private readonly outboxClaimTimeoutMs: number,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  // ---------------------------------------------------------------------------
  // Enqueue (participates in caller's transaction)
  // ---------------------------------------------------------------------------

  /**
   * Inserts outbox rows within an already-open transaction.
   * The caller owns the PoolClient and manages BEGIN/COMMIT.
   * Called by the adapter from bootstrapRunTx and appendAndEnqueueTx.
   */
  async enqueueWithClient(
    client: PoolClient,
    runId: RunId,
    events: EventEnvelope[]
  ): Promise<void> {
    const createdAt = this.now();
    for (const event of events) {
      this.assertShardAssignmentIdentity(event, runId);
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.outbox (
            id,
            tenant_id,
            run_id,
            shard_id,
            run_seq,
            created_at,
            idempotency_key,
            payload,
            attempts
          )
          VALUES (
            $1,
            $2,
            $3,
            ((mod((('x' || left(md5(length($2::text)::text || ':' || $2::text), 16))::bit(64)::bigint), $8::bigint) + $8::bigint) % $8::bigint)::int,
            $4,
            $5::timestamptz,
            $6,
            $7::jsonb,
            0
          )
          ON CONFLICT (id) DO NOTHING
        `,
        [
          `${runId}:${event.runSeq}`,
          event.tenantId,
          runId,
          event.runSeq,
          createdAt,
          event.idempotencyKey,
          JSON.stringify(event),
          this.outboxShardCount,
        ]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // IOutboxStorage â€” outbox operations
  // ---------------------------------------------------------------------------

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    await this.withTransaction(async (client) => {
      await enterPostgresMaintenanceContext(client, OUTBOX_SERVICE_ACCESS);
      await this.enqueueWithClient(client, runId, events);
    });
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.listPendingForClaim(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];
    const shardIds = normalizeShardSelection(selection?.shardIds);
    if (shardIds?.length === 0) {
      return [];
    }

    return this.withTransaction(async (client) => {
      await enterPostgresMaintenanceContext(client, OUTBOX_SERVICE_ACCESS);
      const now = this.now();
      const params: unknown[] = [boundedLimit, now, this.outboxClaimTimeoutMs];
      let shardFilterClause = '';
      if (shardIds) {
        params.push(shardIds);
        shardFilterClause = `AND o.shard_id = ANY($${params.length}::int[])`;
      }

      const result = await client.query<OutboxRow>(
        `
          WITH picked AS (
            SELECT o.id
            FROM ${quoteIdentifier(this.schema)}.outbox o
            WHERE o.delivered_at IS NULL
              AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $2::timestamptz)
              AND (
                o.claimed_at IS NULL
                OR o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
              )
              ${shardFilterClause}
              AND NOT EXISTS (
                SELECT 1
                FROM ${quoteIdentifier(this.schema)}.outbox prior
                WHERE prior.run_id = o.run_id
                  AND prior.tenant_id = o.tenant_id
                  AND prior.delivered_at IS NULL
                  AND prior.run_seq < o.run_seq
              )
              AND NOT EXISTS (
                SELECT 1
                FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
                WHERE dl.run_id = o.run_id
                  AND dl.tenant_id = o.tenant_id
              )
            ORDER BY o.created_at ASC, o.run_seq ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          ), claimed AS (
            UPDATE ${quoteIdentifier(this.schema)}.outbox o
            SET claimed_at = $2::timestamptz
            FROM picked
            WHERE o.id = picked.id
            RETURNING o.id, o.created_at, o.idempotency_key, o.payload, o.attempts, o.last_error, o.next_attempt_at
          )
          SELECT * FROM claimed
          ORDER BY created_at ASC
        `,
        params
      );

      return result.rows.map((row: OutboxRow) => {
        const record: OutboxRecord = {
          id: row.id,
          createdAt: row.created_at,
          idempotencyKey: row.idempotency_key,
          payload: row.payload,
          attempts: Number(row.attempts),
        };
        if (row.last_error !== null) {
          record.lastError = row.last_error;
        }
        if (row.next_attempt_at !== undefined && row.next_attempt_at !== null) {
          record.nextAttemptAt = row.next_attempt_at;
        }
        return record;
      });
    });
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, OUTBOX_SERVICE_ACCESS);
      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.outbox
          SET delivered_at = $2,
              claimed_at = NULL
          WHERE id = ANY($1::text[])
        `,
        [ids, this.now()]
      );
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.withTransaction(async (client) => {
      await enterPostgresMaintenanceContext(client, OUTBOX_SERVICE_ACCESS);
      const result = await client.query<MarkFailedRow>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.outbox
          SET attempts = attempts + 1,
              last_error = $2,
              next_attempt_at = CASE
                WHEN attempts + 1 >= ${MAX_OUTBOX_ATTEMPTS} THEN NULL
                ELSE $3::timestamptz + make_interval(secs => LEAST(60, POWER(2, GREATEST(0, attempts))))
              END,
              claimed_at = NULL
          WHERE id = $1
          RETURNING attempts, payload, tenant_id, run_id, shard_id
        `,
        [id, error, this.now()]
      );

      const row = result.rows[0];
      if (row && row.attempts >= MAX_OUTBOX_ATTEMPTS) {
        await client.query(
          `
            INSERT INTO ${quoteIdentifier(this.schema)}.outbox_dead_letter
              (id, original_id, tenant_id, run_id, shard_id, payload, last_error, dead_lettered_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            `dl_${id}`,
            id,
            row.tenant_id,
            row.run_id,
            row.shard_id,
            JSON.stringify(row.payload),
            error,
            this.now(),
          ]
        );
        await client.query(`DELETE FROM ${quoteIdentifier(this.schema)}.outbox WHERE id = $1`, [
          id,
        ]);
      }
    });
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    const shardIds = normalizeShardSelection(selection?.shardIds);
    if (shardIds?.length === 0) {
      return false;
    }
    return this.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, OUTBOX_SERVICE_ACCESS);
      const params: unknown[] = [];
      let shardFilterClause = '';
      if (shardIds) {
        params.push(shardIds);
        shardFilterClause = `AND shard_id = ANY($${params.length}::int[])`;
      }
      const result = await client.query<{ has_pending_retries: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM ${quoteIdentifier(this.schema)}.outbox
            WHERE delivered_at IS NULL
              AND attempts > 0
              AND attempts < ${MAX_OUTBOX_ATTEMPTS}
              ${shardFilterClause}
          ) AS has_pending_retries
        `,
        params
      );
      return result.rows[0]?.has_pending_retries ?? false;
    });
  }

  // ---------------------------------------------------------------------------
  // IOutboxStorage â€” dead-letter operations
  // ---------------------------------------------------------------------------

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const boundedLimit = Math.max(0, limit);
    if (boundedLimit === 0) return [];

    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      return client.query<DeadLetterRow>(
        `
          SELECT dl.id, dl.original_id, dl.run_id, dl.payload, dl.last_error, dl.dead_lettered_at
          FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
          WHERE dl.tenant_id = $2
          ORDER BY dead_lettered_at DESC
          LIMIT $1
        `,
        [boundedLimit, tenantId]
      );
    });

    return result.rows.map((row) => ({
      id: row.id,
      originalId: row.original_id,
      runId: row.run_id,
      payload: row.payload,
      lastError: row.last_error,
      deadLetteredAt: row.dead_lettered_at,
    }));
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    const tenantId = options.tenantId;
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const limit = Math.max(0, options.limit ?? 100);
    if (limit === 0) return 0;

    return this.withTransaction(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);

      const { params, where, replayedAtParam } = this.buildReplayDeadLettersParams(
        options,
        limit,
        tenantId
      );

      const result = await this.executeReplayDeadLettersQuery(
        client,
        params,
        where,
        replayedAtParam
      );

      return result.rows[0]?.moved ?? 0;
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertShardAssignmentIdentity(event: EventEnvelope, runId: RunId): void {
    if (typeof event.tenantId !== 'string' || event.tenantId.trim().length === 0) {
      throw new Error('INVALID_OUTBOX_SHARD_ASSIGNMENT_TENANT');
    }
    if (typeof runId !== 'string' || runId.trim().length === 0) {
      throw new Error('INVALID_OUTBOX_SHARD_ASSIGNMENT_RUN');
    }
  }

  private buildReplayDeadLettersParams(
    options: { limit?: number; tenantId: string; runId?: string; ids?: string[] },
    limit: number,
    tenantId: string
  ): { params: unknown[]; where: string[]; replayedAtParam: string } {
    const params: unknown[] = [limit, tenantId];
    const where: string[] = [];
    if (options?.runId) {
      params.push(options.runId);
      where.push(`dl.run_id = $${params.length}`);
    }
    if (options?.ids && options.ids.length > 0) {
      params.push(options.ids);
      where.push(`dl.id = ANY($${params.length}::text[])`);
    }
    const replayedAt = this.now();
    params.push(replayedAt);
    const replayedAtParam = `$${params.length}`;
    return { params, where, replayedAtParam };
  }

  private async executeReplayDeadLettersQuery(
    client: PoolClient,
    params: unknown[],
    where: string[],
    replayedAtParam: string
  ): Promise<{ rows: { moved: number }[] }> {
    const query = `
      WITH picked AS (
        SELECT dl.id, dl.original_id, dl.tenant_id, dl.run_id, dl.shard_id, dl.payload
        FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
        WHERE dl.tenant_id = $2
        ${where.length > 0 ? `AND ${where.join(' AND ')}` : ''}
        ORDER BY dead_lettered_at ASC
        LIMIT $1
        FOR UPDATE
      ), inserted AS (
        INSERT INTO ${quoteIdentifier(this.schema)}.outbox (
          id,
          tenant_id,
          run_id,
          shard_id,
          run_seq,
          created_at,
          idempotency_key,
          payload,
          attempts,
          last_error,
          claimed_at,
          delivered_at,
          next_attempt_at
        )
        SELECT
          p.original_id,
          p.tenant_id,
          p.run_id,
          p.shard_id,
          ((p.payload->>'runSeq')::int),
          ${replayedAtParam}::timestamptz,
          (p.payload->>'idempotencyKey'),
          p.payload,
          0,
          NULL,
          NULL,
          NULL,
          NULL
        FROM picked p
        ON CONFLICT (id) DO UPDATE
        SET attempts = 0,
            tenant_id = EXCLUDED.tenant_id,
            last_error = NULL,
            claimed_at = NULL,
            delivered_at = NULL,
            next_attempt_at = NULL,
            created_at = EXCLUDED.created_at,
            shard_id = EXCLUDED.shard_id
        RETURNING id
      ), deleted AS (
        DELETE FROM ${quoteIdentifier(this.schema)}.outbox_dead_letter dl
        USING inserted i
        WHERE dl.original_id = i.id
        RETURNING dl.id
      )
      SELECT COUNT(*)::int AS moved FROM deleted
    `;
    return client.query<{ moved: number }>(query, params);
  }
}
